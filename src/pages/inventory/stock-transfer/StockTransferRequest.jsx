import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  ChevronRight,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  FileText,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardTable, CardFooter } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Container } from '@/components/common/container';
import SearchableSelect from '@/utils/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router';
import {
  getAllRawMaterialItems,
  getAllSubOutlets,
  getOrganizationByType,
  saveTransfer,
  updateDraftTransfer,
  getTransferById,
  receiveTransfer,
  rejectTransfer,
  dispatchTransfer,
  getCurrentStockListGet,
  getCompanyById,
} from '@/services/apiServices';
import { getOrgIdFromToken, getUserIdFromToken } from '@/utils/auth';
import { OrgTypes } from '@/constants/orgTypes';
import { useOrgScope } from '@/hooks/useOrgScope';
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FifoBatchVisualizerModal from './FifoBatchVisualizerModal';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const STATUS_OPTIONS = ['Draft', 'In Transit', 'Rejected', 'Closed'];

const formatStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = String(status).toUpperCase().replace(/[\s_-]/g, '');
  if (s === 'DRAFT') return 'Draft';
  if (s === 'INTRANSIT') return 'In Transit';
  if (s === 'REJECTED') return 'Rejected';
  if (s === 'CLOSED' || s === 'RECEIVED' || s === 'RECIEVED') return 'Closed';
  if (s === 'PENDING') return 'Draft';
  return status;
};

const normalizeCompany = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || item.name || `Company #${item.id}`,
  code: item.companyCode || item.code || '',
  status: item.isActive !== false ? 'active' : 'inactive',
  originalData: item,
});

const normalizeUnit = (item) => ({
  id: item.id,
  name: item.companyNameEnglish || item.name || '',
  code: item.companyCode || item.code || '',
  location: item.cityName || '',
  email: item.email || '',
  mobile: item.mobilenumber || '',
  parentId:
    item.parentId ??
    item.parentOrganizationId ??
    item.parentCompanyId ??
    item.companyId ??
    item.parent?.id ??
    item.organization?.id ??
    null,
  status: item.isActive !== false ? 'active' : 'inactive',
  originalData: item,
});

const extractStockInfo = (item) => {
  const stockObj = item?.currentStock;
  let currentStock = 0;
  let unitName = item?.unit?.nameEnglish || item?.unitName || 'Units';
  let unitId = item?.unitId ?? item?.unit?.id ?? 0;

  if (typeof stockObj === 'object' && stockObj !== null) {
    currentStock = Number(stockObj.currentStock ?? 0);
    if (stockObj.unitName) unitName = stockObj.unitName;
    else if (stockObj.unitSymbol) unitName = stockObj.unitSymbol;
    if (stockObj.unitId != null) unitId = stockObj.unitId;
  } else if (typeof stockObj === 'number') {
    currentStock = stockObj;
  } else {
    currentStock = Number(
      item?.closingStock ??
      item?.opbStock ??
      item?.stock ??
      item?.availableStock ??
      item?.actualStock ??
      0
    );
  }

  return { currentStock, unitName, unitId };
};

const normalizeSubUnit = (item) => ({
  id: item.id,
  name: item.subOutletName || item.name || `Sub-Outlet #${item.id}`,
  code: item.subOutletCode || item.companyCode || item.code || '',
  organizationId: item.organizationId ?? item.outletId ?? item.outlet?.id ?? item.parentOrganizationId,
  status: item.status || (item.isActive !== false ? 'active' : 'inactive'),
  originalData: item,
});

let rowIdCounter = 1;

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const StockTransferRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Mode and transfer ID detection
  const transferIdParam = searchParams.get('id') || location.state?.id || location.state?.transferId;
  const modeParam = (searchParams.get('mode') || location.state?.mode || '').toLowerCase();
  const isReceiveMode =
    modeParam === 'receive' ||
    location.pathname.includes('receive');
  const isDispatchMode = modeParam === 'dispatch';
  const isEditMode = modeParam === 'edit' || (Boolean(transferIdParam) && !isDispatchMode && !isReceiveMode);

  // Permissions hooks
  const transferPermissions = usePagePermissions([
    'Stock Transfer Request',
    'Stock Transfer',
    'STR',
  ]);
  const receivePermissions = usePagePermissions([
    'STR Received',
    'Stock Transfer Request Received',
    'Stock Transfer Receive',
    'STR Receive',
  ]);

  const isAllowed = useMemo(() => {
    if (isReceiveMode) {
      return (
        receivePermissions.canView ||
        receivePermissions.canEdit ||
        receivePermissions.canAdd ||
        transferPermissions.canView ||
        transferPermissions.canEdit ||
        transferPermissions.canAdd
      );
    }
    if (isEditMode) {
      return transferPermissions.canEdit || transferPermissions.canAdd || receivePermissions.canEdit;
    }
    if (isDispatchMode) {
      return transferPermissions.canEdit || transferPermissions.canAdd || transferPermissions.canView;
    }
    // Create mode
    return transferPermissions.canAdd || transferPermissions.canEdit;
  }, [isReceiveMode, isEditMode, isDispatchMode, receivePermissions, transferPermissions]);

  const {
    isOutletUser,
    isCompanyUser,
    isGroupUser,
    units: scopeUnits,
    effectiveOutletId,
    loading: scopeLoading,
  } = useOrgScope();

  // Form State (Header common fields)
  const [transferId, setTransferId] = useState(transferIdParam ? Number(transferIdParam) : 0);
  const [fromOutlet, setFromOutlet] = useState('');
  const [fromSubOutlet, setFromSubOutlet] = useState('');
  const [toOutlet, setToOutlet] = useState('');
  const [toSubOutlet, setToSubOutlet] = useState('');
  const [status, setStatus] = useState('Draft');
  const [transferDate, setTransferDate] = useState(getCurrentDate());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [remarks, setRemarks] = useState('');

  // Table Items State
  const [manifestItems, setManifestItems] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [openRemarkRowIds, setOpenRemarkRowIds] = useState({});

  const toggleRemarkInput = useCallback((rowId) => {
    setOpenRemarkRowIds((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  // Auxiliary data
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [subUnitsLoading, setSubUnitsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSelectValue, setItemSelectValue] = useState('');

  // Confirmation modal state for changing source organization / company when manifest has items
  const [pendingOrgChange, setPendingOrgChange] = useState(null);

  // Submission / Loading states
  const [loadingInitialData, setLoadingInitialData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // FIFO Visualizer Modal State
  const [visualizerModalOpen, setVisualizerModalOpen] = useState(false);
  const [selectedVisualizerItem, setSelectedVisualizerItem] = useState(null);

  // Reject Confirmation Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Fetch Companies, Outlets and Sub-Outlets
  const fetchCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const res = await getOrganizationByType(OrgTypes.SUB_COMPANY);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      const compList = Array.isArray(list) ? list : [];
      setCompanies(compList.map(normalizeCompany));
    } catch (err) {
      console.error('Failed to load companies:', err);
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const fetchUnits = async () => {
    setUnitsLoading(true);
    try {
      const res = await getOrganizationByType(OrgTypes.OUTLET);
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      const outlets = Array.isArray(list) ? list : [];
      setUnits(outlets.map(normalizeUnit));
    } catch (err) {
      console.error('Failed to load outlets:', err);
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  const fetchSubUnits = async () => {
    setSubUnitsLoading(true);
    try {
      const res = await getAllSubOutlets();
      const list = res?.data?.data || res?.data?.content || res?.data || [];
      const subOutletList = Array.isArray(list) ? list : [];
      setSubUnits(subOutletList.map(normalizeSubUnit));
    } catch (err) {
      console.error('Failed to load sub outlets:', err);
      setSubUnits([]);
    } finally {
      setSubUnitsLoading(false);
    }
  };

  // 2. Fetch Raw Material Items with organization and sub-outlet scope
  const fetchAllItems = useCallback(async (orgId, subId) => {
    const targetOrg = orgId !== undefined ? orgId : (fromOutlet || (isOutletUser ? effectiveOutletId : ''));
    const targetSub = subId !== undefined ? subId : (fromSubOutlet || '');

    // If no outlet is selected or available, do not fetch items
    if (!targetOrg) {
      setItems([]);
      return [];
    }

    setItemsLoading(true);
    try {
      const res = await getAllRawMaterialItems(0, 0, true, '', '', '', targetOrg, targetSub);
      const responseData = res?.data?.data || res?.data || {};
      const rawItems = responseData['Raw Material Details'] || (Array.isArray(responseData) ? responseData : []);

      const mappedItems = rawItems.map((item) => {
        const { currentStock, unitName, unitId } = extractStockInfo(item);
        return {
          id: item.id,
          itemName: item.nameEnglish || item.name,
          category: item.rawMaterialCat?.nameEnglish || item.rawMaterialCategoryName || '',
          unit: unitName,
          unitId: unitId,
          currentStock: currentStock,
          originalData: item,
        };
      });

      setItems(mappedItems);
      return mappedItems;
    } catch (err) {
      console.error('Failed to load raw material items:', err);
      setItems([]);
      return [];
    } finally {
      setItemsLoading(false);
    }
  }, [fromOutlet, fromSubOutlet, isOutletUser, effectiveOutletId]);

  // Helper to handle change of Source Outlet / Sub-Outlet and sync stock
  const handleSourceOrgChange = async (targetOrgId, targetSubOutletId) => {
    if (!targetOrgId) {
      setItems([]);
      return;
    }
    // 1. Fetch all raw materials with the new organizationId & subOutletId
    const updatedItems = await fetchAllItems(targetOrgId, targetSubOutletId);

    // 2. If manifest has selected items, fetch current stock list for those items
    if (manifestItems.length > 0 && targetOrgId) {
      const itemIds = manifestItems.map((item) => item.itemId).filter(Boolean);
      if (itemIds.length > 0) {
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

          // Update manifestItems with new stock values
          setManifestItems((prev) =>
            prev.map((row) => {
              const matchedStock = stockList.find(
                (s) => Number(s.itemId || s.id) === Number(row.itemId)
              );
              if (matchedStock) {
                return {
                  ...row,
                  currentStock: Number(matchedStock.currentStock ?? 0),
                  unit: matchedStock.unitName || matchedStock.unitSymbol || row.unit,
                  unitId: matchedStock.unitId || row.unitId,
                };
              }
              const matchedRaw = updatedItems.find((rm) => Number(rm.id) === Number(row.itemId));
              if (matchedRaw) {
                return {
                  ...row,
                  currentStock: matchedRaw.currentStock ?? 0,
                  unit: matchedRaw.unit && matchedRaw.unit !== 'Units' ? matchedRaw.unit : row.unit,
                  unitId: matchedRaw.unitId || row.unitId,
                };
              }
              return row;
            })
          );
        } catch (stockErr) {
          console.error('Failed to fetch current stock list:', stockErr);
          if (updatedItems.length > 0) {
            setManifestItems((prev) =>
              prev.map((row) => {
                const matchedRaw = updatedItems.find((rm) => Number(rm.id) === Number(row.itemId));
                return matchedRaw ? { ...row, currentStock: matchedRaw.currentStock ?? 0 } : row;
              })
            );
          }
        }
      }
    }
  };

  const handleCompanyChange = (newCompany) => {
    if (String(newCompany) === String(selectedCompany)) return;
    const compObj = companies.find((c) => String(c.id) === String(newCompany));
    const targetName = compObj?.name || (newCompany ? 'selected company' : 'all companies');

    if (manifestItems.length > 0) {
      setPendingOrgChange({
        type: 'company',
        targetCompanyId: newCompany,
        targetName,
      });
    } else {
      setSelectedCompany(newCompany);
      setFromOutlet('');
      setFromSubOutlet('');
      setToOutlet('');
      setToSubOutlet('');
      setItems([]);
    }
  };

  const handleFromOutletChange = (newFrom) => {
    if (String(newFrom) === String(fromOutlet)) return;
    const unitObj = effectiveUnits.find((u) => String(u.id) === String(newFrom));
    const targetName = unitObj?.name || 'selected outlet';

    if (manifestItems.length > 0) {
      setPendingOrgChange({
        type: 'outlet',
        targetOrgId: newFrom,
        targetSubOutletId: '',
        targetName,
      });
    } else {
      setFromOutlet(newFrom);
      setFromSubOutlet('');
      if (newFrom) {
        handleSourceOrgChange(newFrom, '');
      } else {
        setItems([]);
      }
    }
  };

  const handleFromSubOutletChange = (newSub) => {
    if (String(newSub) === String(fromSubOutlet)) return;
    const subObj = subUnits.find((s) => String(s.id) === String(newSub));
    const parentOrg = fromOutlet || (isOutletUser ? effectiveOutletId : '');
    const targetName = subObj?.name || (newSub ? 'selected sub-outlet' : 'main store');

    if (manifestItems.length > 0) {
      setPendingOrgChange({
        type: 'subOutlet',
        targetOrgId: parentOrg,
        targetSubOutletId: newSub,
        targetName,
      });
    } else {
      setFromSubOutlet(newSub);
      if (parentOrg) {
        handleSourceOrgChange(parentOrg, newSub);
      }
    }
  };

  const handleConfirmOrgChange = async () => {
    if (!pendingOrgChange) return;
    const { type, targetOrgId, targetSubOutletId, targetCompanyId } = pendingOrgChange;
    if (type === 'company') {
      setSelectedCompany(targetCompanyId);
      setFromOutlet('');
      setFromSubOutlet('');
      setToOutlet('');
      setToSubOutlet('');
      setManifestItems([]);
      setItems([]);
    } else if (type === 'outlet') {
      setFromOutlet(targetOrgId);
      setFromSubOutlet('');
    } else if (type === 'subOutlet') {
      setFromSubOutlet(targetSubOutletId);
    }
    setPendingOrgChange(null);
    if (type !== 'company') {
      if (targetOrgId) {
        await handleSourceOrgChange(targetOrgId, targetSubOutletId);
      } else {
        setItems([]);
      }
    }
  };

  const handleCancelOrgChange = () => {
    setPendingOrgChange(null);
  };

  useEffect(() => {
    fetchCompanies();
    fetchUnits();
    fetchSubUnits();
  }, []);

  // For Outlet Users: Auto-set From Outlet and load items once scope is resolved
  useEffect(() => {
    if (transferIdParam || scopeLoading) return;

    if (isOutletUser && effectiveOutletId) {
      setFromOutlet(String(effectiveOutletId));
      fetchAllItems(effectiveOutletId, '');
    }
  }, [isOutletUser, effectiveOutletId, transferIdParam, scopeLoading]);

  // 3. Load existing transfer details if in Edit, Dispatch, or Receive mode
  useEffect(() => {
    if (!transferIdParam) return;

    const loadTransferDetails = async () => {
      setLoadingInitialData(true);
      try {
        const res = await getTransferById(transferIdParam);
        const data = res?.data?.data ?? res?.data ?? res;
        if (data) {
          setTransferId(Number(data.id || transferIdParam));
          const fromOrg = String(
            data.fromOrganizationId ||
            data.fromOutletId ||
            data.fromOrganization?.id ||
            data.fromOutlet?.id ||
            data.fromOrgId ||
            location.state?.fromOrganizationId ||
            location.state?.fromOutletId ||
            (isOutletUser && effectiveOutletId ? effectiveOutletId : '') ||
            ''
          );
          const fromSub = String(
            data.fromSubOutletId ||
            data.fromSubOutlet?.id ||
            data.fromSubOrgId ||
            location.state?.fromSubOutletId ||
            ''
          );

          if (fromOrg) {
            setFromOutlet(fromOrg);
            if (isGroupUser) {
              const matched = units.find((u) => String(u.id) === String(fromOrg));
              const compId = matched?.parentId;
              if (compId) {
                setSelectedCompany(String(compId));
              } else {
                getCompanyById(fromOrg)
                  .then((orgRes) => {
                    const orgData = orgRes?.data?.data ?? orgRes?.data ?? orgRes;
                    const parentId =
                      orgData?.parentId ??
                      orgData?.parentOrganizationId ??
                      orgData?.parentCompanyId ??
                      orgData?.companyId;
                    if (parentId) {
                      setSelectedCompany(String(parentId));
                    }
                  })
                  .catch((e) => console.warn('Failed to resolve company for fromOrg:', e));
              }
            }
          }
          if (fromSub) setFromSubOutlet(fromSub);
          if (data.toOrganizationId || data.toOutletId) {
            setToOutlet(String(data.toOrganizationId || data.toOutletId));
          }
          if (data.toSubOutletId) setToSubOutlet(String(data.toSubOutletId));
          if (data.vehicleNumber) setVehicleNumber(data.vehicleNumber);
          if (data.driverName) setDriverName(data.driverName);
          if (data.driverContact) setDriverContact(data.driverContact);
          if (data.remarks) setRemarks(data.remarks);
          if (data.transferDate) {
            setTransferDate(
              data.transferDate.includes('/')
                ? data.transferDate.split('/').reverse().join('-')
                : data.transferDate
            );
          }
          if (data.status) setStatus(formatStatusLabel(data.status));

          // 1. Fetch raw materials catalogue scoped to source outlet
          const loadedRawItems = await fetchAllItems(fromOrg, fromSub);

          const rawItems = Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.transferItems)
            ? data.transferItems
            : Array.isArray(data.details)
            ? data.details
            : Array.isArray(location.state?.items)
            ? location.state.items
            : Array.isArray(location.state?.transferItems)
            ? location.state.transferItems
            : [];

          if (rawItems.length > 0) {
            const itemIds = rawItems
              .map(
                (item) =>
                  item.itemId ||
                  item.rawMaterialId ||
                  item.rawMaterial?.id ||
                  item.rawMaterialItem?.id ||
                  item.id
              )
              .filter(Boolean);

            let stockMap = {};
            if (itemIds.length > 0 && fromOrg) {
              try {
                const params = {
                  itemIds,
                  itemType: 'RAW_MATERIAL',
                  organizationId: Number(fromOrg),
                };
                if (fromSub) {
                  params.subOutletId = Number(fromSub);
                }
                const stockRes = await getCurrentStockListGet(params);
                const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
                const stockList = Array.isArray(stockData)
                  ? stockData
                  : Array.isArray(stockData?.content)
                  ? stockData.content
                  : Array.isArray(stockData?.list)
                  ? stockData.list
                  : Array.isArray(stockData?.['Current Stock Details'])
                  ? stockData['Current Stock Details']
                  : [];

                stockList.forEach((s) => {
                  const sId = Number(s.itemId || s.rawMaterialId || s.rawMaterial?.id || s.id);
                  if (sId) {
                    stockMap[sId] = s;
                  }
                });
              } catch (stockErr) {
                console.error('Failed to load current stock list for transfer items:', stockErr);
              }
            }

            setManifestItems(
              rawItems.map((item, idx) => {
                const targetItemId = Number(
                  item.itemId ||
                  item.rawMaterialId ||
                  item.rawMaterial?.id ||
                  item.rawMaterialItem?.id ||
                  (item.itemId !== undefined ? item.itemId : item.id)
                );
                const lineItemId = Number(item.id || item.transferItemId || 0);
                const matchedStock = stockMap[targetItemId];
                const matchedRawItem = loadedRawItems.find((rm) => Number(rm.id) === targetItemId);

                const originalOrderQty = Number(
                  item.requestedQuantity ??
                  item.orderQuantity ??
                  item.orderQty ??
                  item.transferQty ??
                  item.transferQuantity ??
                  item.quantity ??
                  item.qty ??
                  0
                );
                const originalTransferQty = Number(
                  item.transferQty ??
                  item.transferQuantity ??
                  item.requestedQuantity ??
                  item.orderQuantity ??
                  item.orderQty ??
                  item.quantity ??
                  item.qty ??
                  0
                );
                const accQty = Number(item.acceptedQuantity ?? (isReceiveMode ? originalOrderQty : 0));
                const rejQty = Number(item.rejectedQuantity ?? Math.max(0, originalOrderQty - accQty));

                let currentStockVal = 0;
                if (matchedStock != null) {
                  if (typeof matchedStock.currentStock === 'object' && matchedStock.currentStock !== null) {
                    currentStockVal = Number(matchedStock.currentStock.currentStock ?? 0);
                  } else if (matchedStock.currentStock != null) {
                    currentStockVal = Number(matchedStock.currentStock);
                  } else if (matchedStock.availableStock != null) {
                    currentStockVal = Number(matchedStock.availableStock);
                  } else if (matchedStock.stock != null) {
                    currentStockVal = Number(matchedStock.stock);
                  }
                } else if (matchedRawItem != null) {
                  currentStockVal = Number(matchedRawItem.currentStock ?? 0);
                } else if (typeof item.currentStock === 'object' && item.currentStock !== null) {
                  currentStockVal = Number(item.currentStock.currentStock ?? 0);
                } else if (item.currentStock != null) {
                  currentStockVal = Number(item.currentStock);
                } else if (item.availableStock != null) {
                  currentStockVal = Number(item.availableStock);
                }

                const unitVal =
                  matchedStock?.unitName ||
                  matchedStock?.unitSymbol ||
                  matchedRawItem?.unit ||
                  item.unitName ||
                  item.unit ||
                  'Units';

                const unitIdVal =
                  matchedStock?.unitId ||
                  matchedRawItem?.unitId ||
                  item.unitId ||
                  0;

                return {
                  rowId: rowIdCounter++,
                  id: lineItemId,
                  transferItemId: lineItemId,
                  itemId: targetItemId,
                  itemName:
                    item.itemName ||
                    item.rawMaterialName ||
                    matchedRawItem?.itemName ||
                    `Item #${targetItemId || idx + 1}`,
                  unit: unitVal,
                  unitId: unitIdVal,
                  orderQty: originalOrderQty,
                  transferQty: originalTransferQty,
                  acceptedQty: accQty,
                  rejectedQty: rejQty,
                  currentStock: Number(currentStockVal || 0),
                  batchNumber: item.batchNumber || '',
                  expiryDate: item.expiryDate || '',
                  remarks: item.remarks || '',
                };
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to load transfer by id:', err);
        toast.error('Failed to load transfer request details');
      } finally {
        setLoadingInitialData(false);
      }
    };

    loadTransferDetails();
  }, [transferIdParam, isReceiveMode, isOutletUser, isGroupUser, effectiveOutletId, location.state, units]);

  // Synchronize company for Group user if fromOutlet exists but selectedCompany is not set
  useEffect(() => {
    if (isGroupUser && fromOutlet && !selectedCompany && units.length > 0) {
      const matched = units.find((u) => String(u.id) === String(fromOutlet));
      if (matched?.parentId) {
        setSelectedCompany(String(matched.parentId));
      }
    }
  }, [isGroupUser, fromOutlet, selectedCompany, units]);

  // Synchronize manifest item details & available currentStock when raw material items finish fetching
  useEffect(() => {
    if (items.length > 0) {
      setManifestItems((prev) =>
        prev.map((row) => {
          const matchedItem = items.find((rm) => Number(rm.id) === Number(row.itemId));
          if (matchedItem) {
            return {
              ...row,
              currentStock:
                matchedItem.currentStock !== undefined && matchedItem.currentStock !== null
                  ? matchedItem.currentStock
                  : row.currentStock,
              itemName: row.itemName && !row.itemName.startsWith('Item #') ? row.itemName : matchedItem.itemName,
              unit: row.unit && row.unit !== 'Units' ? row.unit : matchedItem.unit,
              unitId: row.unitId || matchedItem.unitId,
            };
          }
          return row;
        })
      );
    }
  }, [items]);

  // Options - Scope based outlets (strictly company outlets for company user, company-filtered for group user, same parent company for outlet user)
  const companyOptions = useMemo(() => {
    return companies.map((c) => ({
      value: String(c.id),
      label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
    }));
  }, [companies]);

  const effectiveUnits = useMemo(() => {
    if (isGroupUser) {
      if (!selectedCompany) return [];
      return units.filter((u) => String(u.parentId) === String(selectedCompany));
    }
    if (isCompanyUser || isOutletUser) {
      return (scopeUnits || []).map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code || '',
      }));
    }
    if (scopeUnits && scopeUnits.length > 0) {
      return scopeUnits.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code || '',
      }));
    }
    return units;
  }, [isGroupUser, selectedCompany, isCompanyUser, isOutletUser, scopeUnits, units]);

  const outletOptions = useMemo(() => {
    return effectiveUnits.map((unit) => ({
      value: String(unit.id),
      label: `${unit.name}${unit.code ? ` (${unit.code})` : ''}`,
    }));
  }, [effectiveUnits]);

  const toOutletOptions = useMemo(() => {
    return outletOptions.filter((opt) => {
      if (isOutletUser && effectiveOutletId && String(opt.value) === String(effectiveOutletId)) {
        return false;
      }
      if (fromOutlet && String(opt.value) === String(fromOutlet)) {
        return false;
      }
      return true;
    });
  }, [outletOptions, isOutletUser, effectiveOutletId, fromOutlet]);
  const fromSubOutletOptions = useMemo(() => {
    const targetFromId = fromOutlet || (isOutletUser ? effectiveOutletId : null);
    if (!targetFromId) return [];
    return subUnits
      .filter((sub) => String(sub.organizationId) === String(targetFromId))
      .map((sub) => ({
        value: String(sub.id),
        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
      }));
  }, [subUnits, fromOutlet, isOutletUser, effectiveOutletId]);

  const toSubOutletOptions = useMemo(() => {
    if (!toOutlet) return [];
    return subUnits
      .filter((sub) => String(sub.organizationId) === String(toOutlet))
      .map((sub) => ({
        value: String(sub.id),
        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
      }));
  }, [subUnits, toOutlet]);

  const itemOptions = useMemo(
    () =>
      items
        .filter((item) => !manifestItems.some((row) => row.itemId === item.id))
        .map((item) => ({
          value: String(item.id),
          label: `${item.itemName} — ${item.category ? `${item.category} · ` : ''}${item.currentStock} ${item.unit}`,
        })),
    [items, manifestItems]
  );

  // Add Item to Manifest
  const handleAddItem = (item) => {
    if (!item) return;
    const newRowId = rowIdCounter++;
    const activeOrgId = fromOutlet || (isOutletUser ? effectiveOutletId : '');

    setManifestItems((prev) => {
      if (prev.some((row) => row.itemId === item.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          rowId: newRowId,
          id: 0,
          itemId: item.id,
          itemName: item.itemName,
          unit: item.unit,
          unitId: item.unitId || 0,
          orderQty: '',
          transferQty: '',
          acceptedQty: '',
          rejectedQty: 0,
          currentStock: Number(item.currentStock ?? 0),
          batchNumber: '',
          expiryDate: '',
          remarks: '',
        },
      ];
    });
    setItemSelectValue('');

    // If an outlet is selected, query exact current stock from current-stock endpoint
    if (activeOrgId) {
      getCurrentStockListGet({
        itemIds: [item.id],
        itemType: 'RAW_MATERIAL',
        organizationId: Number(activeOrgId),
        ...(fromSubOutlet ? { subOutletId: Number(fromSubOutlet) } : {}),
      })
        .then((stockRes) => {
          const stockData = stockRes?.data?.data ?? stockRes?.data ?? [];
          const stockList = Array.isArray(stockData)
            ? stockData
            : Array.isArray(stockData?.content)
            ? stockData.content
            : Array.isArray(stockData?.list)
            ? stockData.list
            : [];
          const matchedStock = stockList.find(
            (s) => Number(s.itemId || s.id) === Number(item.id)
          );
          if (matchedStock && matchedStock.currentStock !== undefined) {
            setManifestItems((prev) =>
              prev.map((row) =>
                row.rowId === newRowId
                  ? {
                      ...row,
                      currentStock: Number(matchedStock.currentStock ?? 0),
                      unit: matchedStock.unitName || matchedStock.unitSymbol || row.unit,
                      unitId: matchedStock.unitId || row.unitId,
                    }
                  : row
              )
            );
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch exact current stock for item:', item.id, err);
        });
    }
  };

  const handleItemSelectChange = (e) => {
    const selectedId = e.target.value;
    setItemSelectValue(selectedId);
    const item = items.find((i) => String(i.id) === String(selectedId));
    if (item) {
      handleAddItem(item);
    }
  };

  const handleRemoveItem = useCallback((rowId) => {
    setManifestItems((prev) => prev.filter((row) => row.rowId !== rowId));
  }, []);

  const updateItemField = useCallback((rowId, field, value) => {
    setManifestItems((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const transferMax = Number(row.transferQty || row.orderQty || 0);

        if (field === 'acceptedQty') {
          let valNum = value === '' ? '' : Number(value);
          if (valNum !== '' && !isNaN(valNum)) {
            if (valNum > transferMax) {
              valNum = transferMax;
            } else if (valNum < 0) {
              valNum = 0;
            }
          }
          const numForCalc = valNum === '' ? 0 : valNum;
          const autoRej = Math.max(0, transferMax - numForCalc);
          return {
            ...row,
            acceptedQty: valNum,
            rejectedQty: autoRej,
          };
        }

        if (field === 'rejectedQty') {
          let valNum = value === '' ? '' : Number(value);
          if (valNum !== '' && !isNaN(valNum)) {
            if (valNum > transferMax) {
              valNum = transferMax;
            } else if (valNum < 0) {
              valNum = 0;
            }
          }
          const numForCalc = valNum === '' ? 0 : valNum;
          const autoAcc = Math.max(0, transferMax - numForCalc);
          return {
            ...row,
            rejectedQty: valNum,
            acceptedQty: autoAcc,
          };
        }

        const updated = { ...row, [field]: value };
        if (field === 'orderQty' && (!row.transferQty || row.transferQty === row.orderQty)) {
          updated.transferQty = value;
        }
        return updated;
      })
    );
  }, []);

  const stockBadgeClass = useCallback((row) => {
    const qty = Number(row.transferQty || row.orderQty);
    if (!qty || Number.isNaN(qty)) {
      return 'border-[#E2E8F0] text-gray-600 bg-gray-50';
    }
    if (qty > Number(row.currentStock)) {
      return 'border-amber-300 bg-amber-50 text-amber-700';
    }
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }, []);

  // Validation
  const validateForm = () => {
    if (isGroupUser && !selectedCompany) {
      toast.error('Please select Company');
      return false;
    }
    const actualFromOutlet = fromOutlet || (isOutletUser ? String(effectiveOutletId) : '');
    if (!actualFromOutlet) {
      toast.error('Please select From Outlet');
      return false;
    }
    if (!toOutlet) {
      toast.error('Please select To Outlet');
      return false;
    }
    if (String(actualFromOutlet) === String(toOutlet)) {
      if (!fromSubOutlet && !toSubOutlet) {
        toast.error('From Outlet and To Outlet cannot be the same');
        return false;
      }
      if (fromSubOutlet && toSubOutlet && String(fromSubOutlet) === String(toSubOutlet)) {
        toast.error('From Sub-Outlet and To Sub-Outlet cannot be the same');
        return false;
      }
    }

    if (vehicleNumber && vehicleNumber.trim()) {
      const cleanVehicle = vehicleNumber.trim().replace(/[\s-]/g, '').toUpperCase();
      const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i;
      if (!vehicleRegex.test(cleanVehicle)) {
        toast.error('Please enter a valid vehicle registration number (e.g., GJ-01-AB-1234)');
        return false;
      }
    }

    if (driverContact && driverContact.trim()) {
      const cleanMobile = driverContact.trim().replace(/[\s-]/g, '');
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(cleanMobile)) {
        toast.error('Please enter a valid 10-digit mobile number (starting with 6-9)');
        return false;
      }
    }

    if (manifestItems.length === 0) {
      toast.error('Add at least one raw material item to the transfer manifest');
      return false;
    }
    for (const item of manifestItems) {
      const qty = Number(item.transferQty || item.orderQty);
      if (!qty || qty <= 0) {
        toast.error(`Please enter a valid transfer quantity for ${item.itemName}`);
        return false;
      }
    }
    return true;
  };

  // Build Payload
  const buildPayload = (isDraft) => {
    const formattedDate = transferDate
      ? transferDate.includes('-')
        ? transferDate.split('-').reverse().join('/')
        : transferDate
      : '';

    const actualFromOutlet = fromOutlet || (isOutletUser ? String(effectiveOutletId) : '');

    const payload = {
      fromOrganizationId: Number(actualFromOutlet),
      fromSubOutletId: fromSubOutlet ? Number(fromSubOutlet) : null,
      toOrganizationId: Number(toOutlet),
      toSubOutletId: toSubOutlet ? Number(toSubOutlet) : null,
      vehicleNumber: vehicleNumber.trim(),
      driverName: driverName.trim(),
      driverContact: driverContact.trim(),
      remarks: remarks.trim(),
      transferDate: formattedDate,
      isDraft: Boolean(isDraft),
      items: manifestItems.map((item) => {
        const rawItemId = Number(item.itemId || item.rawMaterialId || item.id || 0);
        const transferItemId = Number(
          item.transferItemId ||
          (item.id && item.id !== rawItemId ? item.id : 0) ||
          0
        );
        return {
          id: transferItemId,
          itemId: rawItemId,
          itemType: 'RAW_MATERIAL',
          unitId: Number(item.unitId || 0),
          requestedQuantity: Number(item.transferQty || item.orderQty || 0),
          batchNumber: item.batchNumber || '',
          expiryDate: item.expiryDate || '',
          remarks: item.remarks || '',
        };
      }),
    };

    if (transferId && Number(transferId) > 0) {
      payload.id = Number(transferId);
    }

    return payload;
  };

  // Submit / Save Draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = buildPayload(true);
      if (transferId && Number(transferId) > 0) {
        payload.id = Number(transferId);
        try {
          await updateDraftTransfer(transferId, payload);
        } catch (saveErr) {
          console.warn('Failed to update stock transfer', saveErr);
        }
      } else {
        await saveTransfer(payload);
      }
      toast.success('Stock transfer request saved as draft');
      navigate('/inventory/stock-transfer');
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to save draft';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      let targetId = transferId && Number(transferId) > 0 ? Number(transferId) : null;
      let transferItemsList = [];

      if (!targetId) {
        // Save new transfer first
        const payload = buildPayload(false);
        const saveRes = await saveTransfer(payload);
        const savedData = saveRes?.data?.data ?? saveRes?.data;
        const resId =
          savedData?.id ||
          savedData?.transferId ||
          saveRes?.data?.id ||
          saveRes?.data?.transferId ||
          (typeof savedData === 'number' ? savedData : null);
        if (resId) targetId = Number(resId);

        const itemsFromSave = Array.isArray(savedData?.items)
          ? savedData.items
          : Array.isArray(savedData?.transferItems)
          ? savedData.transferItems
          : Array.isArray(savedData?.details)
          ? savedData.details
          : [];

        if (itemsFromSave.length > 0) {
          transferItemsList = itemsFromSave;
        } else if (targetId) {
          const detailRes = await getTransferById(targetId);
          const detailData = detailRes?.data?.data ?? detailRes?.data;
          transferItemsList = Array.isArray(detailData?.items)
            ? detailData.items
            : Array.isArray(detailData?.transferItems)
            ? detailData.transferItems
            : Array.isArray(detailData?.details)
            ? detailData.details
            : [];
        }
      } else {
        // Existing transfer: update draft first then get saved item IDs
        const payload = buildPayload(false);
        payload.id = Number(targetId);
        try {
          await saveTransfer(payload);
        } catch (saveErr) {
          console.warn('saveTransfer failed, attempting updateDraftTransfer:', saveErr);
          await updateDraftTransfer(targetId, payload);
        }
        const detailRes = await getTransferById(targetId);
        const detailData = detailRes?.data?.data ?? detailRes?.data;
        transferItemsList = Array.isArray(detailData?.items)
          ? detailData.items
          : Array.isArray(detailData?.transferItems)
          ? detailData.transferItems
          : Array.isArray(detailData?.details)
          ? detailData.details
          : [];
      }

      if (!targetId) {
        throw new Error('Failed to retrieve stock transfer ID for dispatch');
      }

      // Build dispatch payload according to API specs:
      // In transferItemId key, pass the transfer item id (item.id in transfer.items) and not the raw material id.
      const dispatchItems = manifestItems.map((manifestItem, idx) => {
        const matchedDetail = transferItemsList.find(
          (ti) =>
            Number(ti.id) === Number(manifestItem.transferItemId) ||
            Number(ti.itemId || ti.rawMaterialId) === Number(manifestItem.itemId)
        ) || transferItemsList[idx];

        const transferItemId = Number(
          matchedDetail?.id ||
          matchedDetail?.transferItemId ||
          manifestItem.transferItemId ||
          (manifestItem.id && Number(manifestItem.id) !== Number(manifestItem.itemId) ? manifestItem.id : 0) ||
          manifestItem.id ||
          0
        );

        const dispatchedQuantity = Number(
          manifestItem.transferQty !== undefined && manifestItem.transferQty !== ''
            ? manifestItem.transferQty
            : manifestItem.orderQty || 0
        );

        return {
          transferItemId,
          dispatchedQuantity,
          batchNumber: manifestItem.batchNumber || matchedDetail?.batchNumber || '',
          expiryDate: manifestItem.expiryDate || matchedDetail?.expiryDate || '',
          remarks: manifestItem.remarks || matchedDetail?.remarks || '',
        };
      });

      const dispatchPayload = {
        driverContact: driverContact.trim(),
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        remarks: remarks.trim(),
        items: dispatchItems,
      };

      await dispatchTransfer(targetId, dispatchPayload);

      toast.success('Stock transfer dispatched successfully');
      navigate('/inventory/stock-transfer');
    } catch (err) {
      console.error('Error dispatching stock transfer:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Failed to dispatch transfer request';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Receive / Reject Actions in Receive Mode
  const totalRejectedQty = useMemo(() => {
    return manifestItems.reduce((acc, item) => acc + Number(item.rejectedQty || 0), 0);
  }, [manifestItems]);

  const handleAcceptTransfer = async () => {
    if (!transferId) {
      toast.error('Invalid transfer ID');
      return;
    }
    for (const item of manifestItems) {
      const transferQty = Number(item.transferQty || item.orderQty || 0);
      const accQty = Number(item.acceptedQty);
      const rejQty = Number(item.rejectedQty || 0);

      if (item.acceptedQty === '' || isNaN(accQty) || accQty < 0) {
        toast.error(`Please enter a valid accepted quantity for ${item.itemName}`);
        return;
      }
      if (rejQty < 0 || isNaN(rejQty)) {
        toast.error(`Please enter a valid rejected quantity for ${item.itemName}`);
        return;
      }
      if (accQty + rejQty > transferQty) {
        toast.error(
          `Sum of accepted (${accQty}) and rejected (${rejQty}) quantities cannot exceed transfer quantity (${transferQty} ${item.unit}) for ${item.itemName}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        remarks: remarks.trim(),
        items: manifestItems.map((item) => ({
          transferItemId: Number(
            item.transferItemId ||
            (item.id && Number(item.id) !== Number(item.itemId) ? item.id : 0) ||
            item.id ||
            0
          ),
          receivedQuantity: Number(item.acceptedQty || 0),
          damagedQuantity: Number(item.rejectedQty || 0),
          remarks: (item.remarks || '').trim(),
          discrepancyRemarks: (item.discrepancyRemarks || item.remarks || '').trim(),
        })),
      };
      await receiveTransfer(transferId, payload);
      toast.success('Stock transfer accepted and stock updated successfully');
      navigate('/inventory/transfer-receive-requests');
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to accept stock transfer';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRejectModal = () => {
    if (!transferId) {
      toast.error('Invalid transfer ID');
      return;
    }
    setRejectionReason(remarks || '');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!transferId) {
      toast.error('Invalid transfer ID');
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error('Please enter a mandatory reason for rejecting the stock transfer');
      return;
    }

    setSubmitting(true);
    try {
      const currentUserId = getUserIdFromToken() || localStorage.getItem('userId') || undefined;
      const payload = {
        id: Number(transferId),
        reason: rejectionReason.trim(),
        userId: currentUserId ? Number(currentUserId) : undefined,
      };
      await rejectTransfer(transferId, payload);
      toast.success('Stock transfer rejected successfully');
      setRejectModalOpen(false);
      navigate('/inventory/transfer-receive-requests');
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.msg || 'Failed to reject stock transfer';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openVisualizerForItem = (row) => {
    if (!fromOutlet || !toOutlet) {
      toast.info('Please select From Outlet and To Outlet to preview FIFO batch flow');
      return;
    }
    const qty = Number(row.transferQty !== '' && row.transferQty !== undefined && row.transferQty !== null ? row.transferQty : row.orderQty || 0);
    if (!qty || qty <= 0) {
      toast.info('Please enter a transfer/requested quantity first to preview FIFO batch flow');
      return;
    }
    const fromName = units.find((u) => String(u.id) === String(fromOutlet))?.name || 'Source Outlet';
    const toName = units.find((u) => String(u.id) === String(toOutlet))?.name || 'Destination Outlet';
    setSelectedVisualizerItem({
      ...row,
      fromOrganizationId: Number(fromOutlet),
      fromSubOutletId: fromSubOutlet ? Number(fromSubOutlet) : undefined,
      toOrganizationId: Number(toOutlet),
      toSubOutletId: toSubOutlet ? Number(toSubOutlet) : undefined,
      fromOutletName: fromName,
      toOutletName: toName,
    });
    setVisualizerModalOpen(true);
  };

  // Table Columns
  const columns = useMemo(() => {
    const cols = [
      {
        id: 'srNo',
        header: ({ column }) => (
          <DataGridColumnHeader title="SR." column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-gray-500 text-xs font-semibold">{String(row.index + 1).padStart(2, '0')}</span>
        ),
        enableSorting: false,
        size: 55,
      },
      {
        id: 'itemName',
        accessorFn: (row) => row.itemName,
        header: ({ column }) => (
          <DataGridColumnHeader title="ITEM NAME" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          const isRemarkOpen = Boolean(openRemarkRowIds[row.original.rowId]);
          const hasRemark = Boolean(row.original.remarks && row.original.remarks.trim());

          return (
            <div className="flex flex-col gap-1 py-1 max-w-full">
              <div className="inline-flex items-center gap-1.5 max-w-full">
                <button
                  type="button"
                  onClick={() => openVisualizerForItem(row.original)}
                  className="group text-left hover:text-[#084E92] transition cursor-pointer truncate max-w-full"
                  title="Click to view FIFO Rate Layers Visualizer"
                >
                  <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#084E92] group-hover:underline truncate">
                    {row.original.itemName}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleRemarkInput(row.original.rowId)}
                  className={`p-1 rounded-md transition cursor-pointer flex-shrink-0 ${
                    isRemarkOpen || hasRemark
                      ? 'text-[#084E92] bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title={isRemarkOpen ? 'Hide remarks' : 'Add / edit remarks'}
                >
                  <Pencil size={13} />
                </button>
              </div>
              {isRemarkOpen && (
                <div className="mt-1">
                  <input
                    type="text"
                    value={row.original.remarks || ''}
                    onChange={(e) => updateItemField(row.original.rowId, 'remarks', e.target.value)}
                    placeholder="Item remarks..."
                    className="h-7 w-full border border-[#E2E8F0] rounded-md px-2 text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 font-normal"
                    autoFocus
                  />
                </div>
              )}
              {!isRemarkOpen && hasRemark && (
                <span className="text-[11px] text-gray-500 italic truncate block" title={row.original.remarks}>
                  Note: {row.original.remarks}
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 240,
      },
      {
        id: 'orderQty',
        accessorFn: (row) => Number(row.orderQty || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="REQUESTED QUANTITY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          if (isReceiveMode || isDispatchMode) {
            return (
              <span className="text-xs font-bold text-gray-800">
                {row.original.orderQty || row.original.transferQty || '0'} {row.original.unit}
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={row.original.orderQty}
                onChange={(e) => updateItemField(row.original.rowId, 'orderQty', e.target.value)}
                placeholder="0"
                className="h-8.5 w-20 border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 font-medium"
              />
              <span className="text-xs text-gray-500 font-medium">{row.original.unit}</span>
            </div>
          );
        },
        size: 160,
      },
    ];

    // Transfer Quantity is shown in Dispatch mode, Receive mode, and Create mode (Hidden in Edit mode)
    if (!isEditMode) {
      cols.push({
        id: 'transferQty',
        accessorFn: (row) => Number(row.transferQty !== undefined && row.transferQty !== '' ? row.transferQty : row.orderQty || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="TRANSFER QUANTITY" column={column} className="text-[#084E92] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => {
          if (isReceiveMode) {
            return (
              <span className="text-xs font-bold text-[#084E92]">
                {row.original.transferQty || row.original.orderQty || '0'} {row.original.unit}
              </span>
            );
          }
          const val =
            row.original.transferQty !== undefined && row.original.transferQty !== ''
              ? row.original.transferQty
              : row.original.orderQty || '';
          return (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={val}
                onChange={(e) => updateItemField(row.original.rowId, 'transferQty', e.target.value)}
                placeholder="0"
                className="h-8.5 w-20 border border-[#E2E8F0] rounded-lg px-2.5 text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 font-medium"
              />
              <span className="text-xs text-gray-500 font-medium">{row.original.unit}</span>
            </div>
          );
        },
        size: 160,
      });
    }

    // Current Stock (shown in non-receive modes)
    if (!isReceiveMode) {
      cols.push({
        id: 'currentStock',
        accessorFn: (row) => Number(row.currentStock || 0),
        header: ({ column }) => (
          <DataGridColumnHeader title="CURRENT STOCK" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${stockBadgeClass(row.original)}`}>
            {row.original.currentStock !== undefined && row.original.currentStock !== null
              ? Number(row.original.currentStock).toFixed(2)
              : '0.00'}{' '}
            {row.original.unit}
          </span>
        ),
        size: 140,
      });
    }

    // Add Accepted and Rejected quantity fields in Receive Mode
    if (isReceiveMode) {
      cols.push(
        {
          id: 'acceptedQty',
          accessorFn: (row) => Number(row.acceptedQty || 0),
          header: ({ column }) => (
            <DataGridColumnHeader title="ACCEPTED QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
          ),
          cell: ({ row }) => {
            const maxVal = Number(row.original.transferQty || row.original.orderQty || 0);
            return (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max={maxVal > 0 ? maxVal : undefined}
                  step="any"
                  value={row.original.acceptedQty}
                  onChange={(e) => updateItemField(row.original.rowId, 'acceptedQty', e.target.value)}
                  placeholder="0"
                  className="h-8.5 w-20 border border-[#E2E8F0] rounded-lg px-2.5 text-xs font-semibold text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                />
                <span className="text-xs text-gray-500 font-medium">{row.original.unit}</span>
              </div>
            );
          },
          size: 150,
        },
        {
          id: 'rejectedQty',
          accessorFn: (row) => Number(row.rejectedQty || 0),
          header: ({ column }) => (
            <DataGridColumnHeader title="DAMAGED / REJECTED QTY" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
          ),
          cell: ({ row }) => {
            const maxVal = Number(row.original.transferQty || row.original.orderQty || 0);
            return (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max={maxVal > 0 ? maxVal : undefined}
                  step="any"
                  value={row.original.rejectedQty}
                  onChange={(e) => updateItemField(row.original.rowId, 'rejectedQty', e.target.value)}
                  placeholder="0"
                  className="h-8.5 w-20 border border-[#E2E8F0] rounded-lg px-2.5 text-xs font-semibold text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20"
                />
                <span className="text-xs text-gray-500 font-medium">{row.original.unit}</span>
              </div>
            );
          },
          size: 180,
        }
      );
    }

    // Normal Request mode action column (Delete item) in Create & Edit modes
    if (!isReceiveMode && !isDispatchMode) {
      cols.push({
        id: 'actions',
        header: ({ column }) => (
          <DataGridColumnHeader title="ACTION" column={column} className="text-[#43474F] font-bold uppercase text-xs" />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleRemoveItem(row.original.rowId)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Delete item"
          >
            <Trash2 size={16} />
          </button>
        ),
        enableSorting: false,
        size: 60,
      });
    }

    return cols;
  }, [
    isReceiveMode,
    isEditMode,
    isDispatchMode,
    openVisualizerForItem,
    updateItemField,
    stockBadgeClass,
    handleRemoveItem,
    openRemarkRowIds,
    toggleRemarkInput,
  ]);

  const table = useReactTable({
    data: manifestItems,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const getPageTitle = () => {
    if (isReceiveMode) return 'Receive & Verify Stock Transfer';
    if (isDispatchMode) return 'Dispatch Stock Transfer';
    if (isEditMode) return 'Edit Stock Transfer Request';
    return 'New Stock Transfer Request';
  };

  if (!isAllowed) {
    return <AccessDenied pageTitle={isReceiveMode ? 'Stock Transfer Request Received' : 'Stock Transfer Request'} />;
  }

  return (
    <Container>
      <div className="py-1 md:py-2 pb-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link to="/inventory/stock-transfer" className="hover:text-gray-600">
            Inventory
          </Link>
          <ChevronRight size={12} />
          <Link
            to={isReceiveMode ? '/inventory/transfer-receive-requests' : '/inventory/stock-transfer'}
            className="hover:text-gray-600"
          >
            {isReceiveMode ? 'Stock Transfer Receive Listing' : 'Stock Transfer'}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-semibold">{getPageTitle()}</span>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">{getPageTitle()}</h1>
            <p className="text-[#43474F] text-sm mt-1">
              {isReceiveMode
                ? 'Review quantities, verify incoming stock batches, and accept or reject the transfer.'
                : isDispatchMode
                ? 'Review requested quantities, enter transfer quantities, and confirm dispatch.'
                : isEditMode
                ? 'Update requested raw material quantities for this draft transfer request.'
                : 'Initiate internal inventory transfer between central warehouses and retail sub-outlets.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(isReceiveMode ? '/inventory/transfer-receive-requests' : '/inventory/stock-transfer')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to List
          </button>
        </div>

        {loadingInitialData || scopeLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm">
            <Loader2 className="w-9 h-9 animate-spin text-[#084E92] mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading transfer request data...</p>
          </div>
        ) : (
          <>
            {/* Header Form Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-5">
              {/* Row 1: Outlets and Status */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  isGroupUser
                    ? 'lg:grid-cols-3 xl:grid-cols-6'
                    : isOutletUser
                    ? 'lg:grid-cols-4'
                    : 'lg:grid-cols-5'
                } gap-4`}
              >
                {/* Company: only rendered for Group users */}
                {isGroupUser && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      className="mt-1.5"
                      options={companyOptions}
                      value={selectedCompany}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      disabled={isReceiveMode || isDispatchMode || companiesLoading}
                      placeholder={companiesLoading ? 'Loading companies...' : 'Select company'}
                    />
                  </div>
                )}

                {/* From Outlet: only rendered for non-outlet users */}
                {!isOutletUser && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      From Outlet <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      className="mt-1.5"
                      options={outletOptions}
                      value={fromOutlet}
                      onChange={(e) => handleFromOutletChange(e.target.value)}
                      disabled={isReceiveMode || isDispatchMode || (isGroupUser && !selectedCompany)}
                      placeholder={
                        isGroupUser && !selectedCompany
                          ? 'Select company first'
                          : unitsLoading
                          ? 'Loading outlets...'
                          : 'Select outlet'
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    From Sub-Outlet <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <SearchableSelect
                    className="mt-1.5"
                    options={fromSubOutletOptions}
                    value={fromSubOutlet}
                    onChange={(e) => handleFromSubOutletChange(e.target.value)}
                    disabled={isReceiveMode || isDispatchMode || (!isOutletUser && !fromOutlet) || subUnitsLoading}
                    placeholder={
                      !isOutletUser && !fromOutlet
                        ? 'Select outlet first'
                        : subUnitsLoading
                        ? 'Loading sub outlets...'
                        : 'Select sub-outlet'
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    To Outlet <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    className="mt-1.5"
                    options={toOutletOptions}
                    value={toOutlet}
                    onChange={(e) => {
                      setToOutlet(e.target.value);
                      setToSubOutlet('');
                    }}
                    disabled={isReceiveMode || isDispatchMode || (isGroupUser && !selectedCompany)}
                    placeholder={
                      isGroupUser && !selectedCompany
                        ? 'Select company first'
                        : unitsLoading
                        ? 'Loading outlets...'
                        : 'Select outlet'
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    To Sub-Outlet <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <SearchableSelect
                    className="mt-1.5"
                    options={toSubOutletOptions}
                    value={toSubOutlet}
                    onChange={(e) => setToSubOutlet(e.target.value)}
                    disabled={isReceiveMode || isDispatchMode || !toOutlet || subUnitsLoading}
                    placeholder={
                      !toOutlet
                        ? 'Select outlet first'
                        : subUnitsLoading
                        ? 'Loading sub outlets...'
                        : 'Select sub-outlet'
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Status</label>
                  <Select value={status} onValueChange={setStatus} disabled>
                    <SelectTrigger className="h-10 mt-1.5 border-[#E2E8F0] rounded-xl bg-gray-50 text-xs text-gray-700 font-medium cursor-not-allowed">
                      <SelectValue placeholder="Draft" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Common Vehicle & Driver Details + Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Vehicle Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. GJ-01-AB-1234"
                    disabled={isReceiveMode}
                    className="h-10 w-full mt-1.5 border border-[#E2E8F0] rounded-xl px-3.5 text-xs outline-none bg-white focus:border-[#2952E3] disabled:bg-gray-50 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver full name"
                    disabled={isReceiveMode}
                    className="h-10 w-full mt-1.5 border border-[#E2E8F0] rounded-xl px-3.5 text-xs outline-none bg-white focus:border-[#2952E3] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Driver Contact</label>
                  <input
                    type="tel"
                    value={driverContact}
                    maxLength={10}
                    onChange={(e) => setDriverContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    disabled={isReceiveMode}
                    className="h-10 w-full mt-1.5 border border-[#E2E8F0] rounded-xl px-3.5 text-xs outline-none bg-white focus:border-[#2952E3] disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Remarks {isReceiveMode && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      isReceiveMode
                        ? 'Mandatory reason/remarks for acceptance or rejection...'
                        : 'Notes or transport reference...'
                    }
                    className="h-10 w-full mt-1.5 border border-[#E2E8F0] rounded-xl px-3.5 text-xs outline-none bg-white focus:border-[#2952E3]"
                  />
                </div>
              </div>
            </div>

            {/* Item Selection Card (Visible in Create and Edit modes) */}
            {!isReceiveMode && !isDispatchMode && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
                <label className="text-xs font-semibold text-gray-700">Add Raw Material Item</label>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-1.5">
                  <SearchableSelect
                    className="w-full flex-1"
                    options={itemOptions}
                    value={itemSelectValue}
                    onChange={handleItemSelectChange}
                    disabled={itemsLoading || (!isOutletUser && !fromOutlet) || (isGroupUser && !selectedCompany)}
                    placeholder={
                      isGroupUser && !selectedCompany
                        ? 'Please select Company first...'
                        : !isOutletUser && !fromOutlet
                        ? 'Please select From Outlet first...'
                        : itemsLoading
                        ? 'Loading items...'
                        : 'Search & select item to transfer... e.g., Basmati Rice 25kg, Pure Ghee 15L'
                    }
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#084E92] font-semibold bg-[#EEF4FE]">
                      <Boxes size={14} />
                      Items Added: {manifestItems.length} {manifestItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Manifest Items Table Card */}
            <div className="w-full border border-[#E2E8F0] rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FE] text-[#2952E3] flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-[#0F172A] text-sm block">Transfer Manifest Items</span>
                    <span className="text-xs text-gray-400">
                      {isReceiveMode
                        ? 'Verify accepted quantities against transfer manifest.'
                        : isDispatchMode
                        ? 'Review requested quantities and enter transfer quantities for dispatch.'
                        : 'Review requested raw material quantities and current stock.'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  Total Items: <strong className="text-[#0F172A]">{manifestItems.length} Distinct Items</strong>
                </span>
              </div>

              <DataGrid table={table} recordCount={manifestItems.length} className="rounded-none border-0">
                <Card className="rounded-none border-0 shadow-none">
                  <CardTable>
                    <DataGridTable />
                  </CardTable>
                  <CardFooter className="bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-2xl flex items-center justify-end py-3">
                    <DataGridPagination />
                  </CardFooter>
                </Card>
              </DataGrid>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {isReceiveMode ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenRejectModal}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#F0B4BC] text-[#C0293D] hover:bg-[#FBEAEC] transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject Stock Transfer
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptTransfer}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#14804A] text-white text-xs font-semibold hover:bg-[#106b3d] transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Accept Stock Transfer
                  </button>
                </>
              ) : isEditMode ? (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold shadow-md hover:bg-[#073e77] transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Save Draft
                </button>
              ) : isDispatchMode ? (
                <button
                  type="button"
                  onClick={handleSubmitTransfer}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold shadow-md hover:bg-[#073e77] transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Confirm Transfer & Dispatch
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitTransfer}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold shadow-md hover:bg-[#073e77] transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Confirm & Submit Transfer
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Reject Confirmation & Reason Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">Reject Stock Transfer</DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Confirm rejection of this stock transfer
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please enter the reason for rejecting this stock transfer..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 transition resize-none text-gray-800"
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submitting || !rejectionReason.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Rejection
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for Location / Company Change */}
        <Dialog open={Boolean(pendingOrgChange)} onOpenChange={(open) => !open && handleCancelOrgChange()}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">
                    {pendingOrgChange?.type === 'company' ? 'Change Company?' : 'Change Source Location?'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    {pendingOrgChange?.type === 'company'
                      ? 'Resetting outlets and manifest items'
                      : 'Updating stock levels for manifest items'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {pendingOrgChange?.type === 'company' ? (
              <div className="py-2 text-xs text-gray-600 leading-relaxed">
                Changing the company to <strong className="text-gray-900">{pendingOrgChange?.targetName}</strong> will clear the selected outlets and reset the <strong className="text-gray-900">{manifestItems.length} item{manifestItems.length > 1 ? 's' : ''}</strong> in your transfer manifest. Do you want to proceed?
              </div>
            ) : (
              <div className="py-2 text-xs text-gray-600 leading-relaxed">
                Changing the source location to <strong className="text-gray-900">{pendingOrgChange?.targetName}</strong> will recalculate and update the current available stock for the <strong className="text-gray-900">{manifestItems.length} item{manifestItems.length > 1 ? 's' : ''}</strong> in your transfer manifest. Do you want to proceed?
              </div>
            )}
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
                {pendingOrgChange?.type === 'company' ? 'Proceed & Reset' : 'Proceed & Update Stock'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* FIFO Batch Flow Visualizer Modal */}
        {selectedVisualizerItem && (
          <FifoBatchVisualizerModal
            isOpen={visualizerModalOpen}
            onClose={() => {
              setVisualizerModalOpen(false);
              setSelectedVisualizerItem(null);
            }}
            transferItemId={
              isReceiveMode || isDispatchMode
                ? selectedVisualizerItem.transferItemId || (selectedVisualizerItem.id && selectedVisualizerItem.id !== selectedVisualizerItem.itemId ? selectedVisualizerItem.id : undefined)
                : undefined
            }
            itemId={Number(selectedVisualizerItem.itemId || selectedVisualizerItem.rawMaterialId || selectedVisualizerItem.id)}
            itemType={selectedVisualizerItem.itemType || 'RAW_MATERIAL'}
            unitId={selectedVisualizerItem.unitId ? Number(selectedVisualizerItem.unitId) : undefined}
            fromOrganizationId={fromOutlet ? Number(fromOutlet) : undefined}
            fromSubOutletId={fromSubOutlet ? Number(fromSubOutlet) : undefined}
            toOrganizationId={toOutlet ? Number(toOutlet) : undefined}
            toSubOutletId={toSubOutlet ? Number(toSubOutlet) : undefined}
            itemName={selectedVisualizerItem.itemName}
            fromOutletName={selectedVisualizerItem.fromOutletName}
            toOutletName={selectedVisualizerItem.toOutletName}
            transferQty={selectedVisualizerItem.transferQty !== '' && selectedVisualizerItem.transferQty != null ? Number(selectedVisualizerItem.transferQty) : selectedVisualizerItem.orderQty != null ? Number(selectedVisualizerItem.orderQty) : 0}
            unit={selectedVisualizerItem.unit || 'kg'}
          />
        )}
      </div>
    </Container>
  );
};

export default StockTransferRequest;