// ============================================
// File: src/pages/inventory/generate-grn/GenerateGRNDetail.jsx
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router';
import {
  ChevronRight,
  Loader2,
  CheckCircle2,
  Building2,
  MapPin,
  Upload,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import {
  createGrn,
  getPOByIdAndOpenItem,
  getPOByidandopenitems,
  getAllSubOutletsByOrganization,
  getGrnById,
  getGrnDetailById,
} from '@/services/apiServices';
import { getUserIdFromToken } from '@/utils/auth';
import { getTodayInputDate } from '@/utils/GetCurrentToday';
import { toast } from 'sonner';
import { usePagePermissions } from '@/utils/permissions';
import { AccessDenied } from '@/components/common/AccessDenied';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white ' +
  'placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300';

const labelCls = 'text-sm font-medium text-gray-700 mb-1.5 block';

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl shadow-2xs ${className}`}>
    {children}
  </div>
);

const GenerateGRNDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canAdd, canView } = usePagePermissions('Generate GRN');
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const poIds = useMemo(() => {
    if (location.state?.poIds && Array.isArray(location.state.poIds) && location.state.poIds.length > 0) {
      return location.state.poIds.map(Number);
    }
    if (location.state?.poId) {
      return [Number(location.state.poId)];
    }
    if (location.state?.returnItem?.purchaseOrderId || location.state?.returnItem?.poId) {
      return [Number(location.state?.returnItem?.purchaseOrderId || location.state?.returnItem?.poId)];
    }
    const allParams = searchParams.getAll('poIds');
    if (allParams && allParams.length > 0) {
      return allParams
        .flatMap((p) => String(p).split(','))
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number);
    }
    const idParam = searchParams.get('id') || id;
    if (!idParam) return [];
    return String(idParam)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
  }, [id, searchParams, location.state]);

  const oldGrnId = searchParams.get('oldGrnId') || location.state?.oldGrnId;
  const grnCodeParam = searchParams.get('grnCode') || location.state?.grnCode;
  const returnGrnDetailId = searchParams.get('returnGrnDetailId') || searchParams.get('returnDetailId') || location.state?.returnGrnDetailId || location.state?.returnDetailId || location.state?.returnItem?.id;
  const returnDetailId = returnGrnDetailId;
  const purchaseOrderDetailIdParam = searchParams.get('purchaseOrderDetailId') || location.state?.purchaseOrderDetailId || location.state?.returnItem?.purchaseOrderDetailId;
  const returnQtyParam = searchParams.get('returnQty') || location.state?.returnQty || location.state?.returnItem?.returnQuantity;
  const returnRawMaterialId = searchParams.get('rawMaterialId') || location.state?.rawMaterialId || location.state?.returnItem?.rawMaterialId;

  const [resolvedGrnCode, setResolvedGrnCode] = useState(grnCodeParam || '');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [po, setPo] = useState(null);

  const [subOutlets, setSubOutlets] = useState([]);
  const [selectedSubOutletId, setSelectedSubOutletId] = useState('');
  const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);

  const [grnDate, setGrnDate] = useState(getTodayInputDate());
  const [remarks, setRemarks] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [items, setItems] = useState([]);
  const [openRemarksMap, setOpenRemarksMap] = useState({});

  const fetchPoData = async () => {
    if (poIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPOByIdAndOpenItem(poIds);
      const rawPo = res?.data?.data ?? res?.data ?? res;

      if (!rawPo || (Array.isArray(rawPo) && rawPo.length === 0)) {
        const errMsg =
          res?.data?.message ||
          res?.data?.msg ||
          'Purchase Order has no open items or is closed.';
        throw new Error(errMsg);
      }

      let normalizedPo = null;
      let combinedDetails = [];
      let poCodeString = '';

      if (Array.isArray(rawPo)) {
        if (rawPo.length === 0) throw new Error('No purchase order data found.');
        const firstPo = rawPo[0];
        poCodeString = rawPo.map((p) => p.poCode || `PO-${p.id}`).filter(Boolean).join(', ');
        combinedDetails = rawPo.flatMap((p) =>
          (p.details || []).map((d) => ({
            ...d,
            poCode: p.poCode || `PO-${p.id}`,
            purchaseOrderId: p.id,
          }))
        );
        normalizedPo = {
          ...firstPo,
          poCodes: poCodeString,
          poCode: poCodeString,
          poIds: rawPo.map((p) => p.id),
          details: combinedDetails,
        };
      } else if (rawPo && typeof rawPo === 'object') {
        poCodeString = Array.isArray(rawPo.poCodes)
          ? rawPo.poCodes.join(', ')
          : (rawPo.poCode || `PO-${rawPo.id}`);

        combinedDetails = (rawPo.details || []).map((d) => ({
          ...d,
          poCode: d.poCode || d.purchaseOrderCode || rawPo.poCode || `PO-${rawPo.id}`,
          purchaseOrderId: d.purchaseOrderId || d.poId || rawPo.id,
        }));

        normalizedPo = {
          ...rawPo,
          poCodes: poCodeString,
          poCode: poCodeString,
          poIds: Array.isArray(rawPo.poIds) ? rawPo.poIds : (rawPo.id ? [rawPo.id] : poIds),
          details: combinedDetails,
        };
      } else {
        throw new Error('Purchase order data not found.');
      }

      setPo(normalizedPo);

      // Previous GRN details map
      const prevGrnDetailsMap = {};

      if (oldGrnId) {
        try {
          const oldGrnRes = await getGrnById(oldGrnId);
          const oldGrn = oldGrnRes?.data?.data ?? oldGrnRes?.data ?? oldGrnRes;
          const oldDetails = Array.isArray(oldGrn?.details) ? oldGrn.details : [];
          oldDetails.forEach((od) => {
            if (od.purchaseOrderDetailId) prevGrnDetailsMap[od.purchaseOrderDetailId] = od;
            if (od.rawMaterialId) prevGrnDetailsMap[`rm_${od.rawMaterialId}`] = od;
          });
        } catch (oldErr) {
          console.warn('Could not fetch previous GRN details:', oldErr);
        }
      }

      // Fetch return GRN detail if returnGrnDetailId is provided
      let returnDetailData = null;
      let targetPoDetailId = purchaseOrderDetailIdParam ? Number(purchaseOrderDetailIdParam) : null;
      let targetRawMaterialId = returnRawMaterialId ? Number(returnRawMaterialId) : null;
      let targetReturnQty = returnQtyParam !== null && returnQtyParam !== undefined ? Number(returnQtyParam) : null;
      let dynamicGrnCode = grnCodeParam;

      if (returnGrnDetailId) {
        try {
          const detailRes = await getGrnDetailById(returnGrnDetailId);
          returnDetailData = detailRes?.data?.data ?? detailRes?.data ?? detailRes;
          if (returnDetailData) {
            if (returnDetailData.grnCode) dynamicGrnCode = returnDetailData.grnCode;
            if (returnDetailData.purchaseOrderDetailId) targetPoDetailId = Number(returnDetailData.purchaseOrderDetailId);
            if (returnDetailData.rawMaterialId) targetRawMaterialId = Number(returnDetailData.rawMaterialId);
            if (returnDetailData.returnQuantity !== undefined && returnDetailData.returnQuantity !== null) {
              targetReturnQty = Number(returnDetailData.returnQuantity);
            }

            const parentGrnId = returnDetailData.grnId || returnDetailData.grnHeaderId || returnDetailData.oldGrnId || returnDetailData.grn?.id;
            if (parentGrnId) {
              try {
                const parentGrnRes = await getGrnById(parentGrnId);
                const parentGrn = parentGrnRes?.data?.data ?? parentGrnRes?.data ?? parentGrnRes;
                const pDetails = Array.isArray(parentGrn?.details) ? parentGrn.details : [];
                pDetails.forEach((od) => {
                  if (od.purchaseOrderDetailId) prevGrnDetailsMap[od.purchaseOrderDetailId] = od;
                  if (od.rawMaterialId) prevGrnDetailsMap[`rm_${od.rawMaterialId}`] = od;
                });
              } catch (pErr) {
                console.warn('Could not fetch parent GRN by ID:', pErr);
              }
            }
          }
        } catch (detailErr) {
          console.warn('Could not fetch return GRN detail by ID:', detailErr);
        }
      }

      setResolvedGrnCode(dynamicGrnCode || '');

      // Fetch sub-outlets for this organization / outlet
      const orgId = normalizedPo.outletId || normalizedPo.orgId;
      if (orgId) {
        try {
          setLoadingSubOutlets(true);
          const subRes = await getAllSubOutletsByOrganization(orgId);
          const rawSubs = subRes?.data?.data ?? subRes?.data ?? subRes ?? [];
          setSubOutlets(Array.isArray(rawSubs) ? rawSubs : []);
        } catch (subErr) {
          console.warn('Failed to load sub-outlets for organization:', subErr);
          setSubOutlets([]);
        } finally {
          setLoadingSubOutlets(false);
        }
      }

      // Populate line items
      const rawDetails = normalizedPo.details || [];
      const mappedItems = rawDetails.map((d, index) => {
        const orderedQty = Number(d.orderedQuantity ?? d.quantity ?? 0);
        const alreadyReceivedQty = Number(d.receivedQuantity ?? 0);
        const remaining = Math.max(0, orderedQty - alreadyReceivedQty);

        // Check if this item is the target return replacement item
        const isDirectTarget =
          Boolean(targetPoDetailId && (Number(d.id) === targetPoDetailId || Number(d.purchaseOrderDetailId) === targetPoDetailId)) ||
          Boolean(targetRawMaterialId && Number(d.rawMaterialId) === targetRawMaterialId) ||
          Boolean(returnGrnDetailId && (Number(d.id) === Number(returnGrnDetailId) || Number(d.purchaseOrderDetailId) === Number(returnGrnDetailId)));

        const prevDetail = prevGrnDetailsMap[d.id] || prevGrnDetailsMap[`rm_${d.rawMaterialId}`];
        const prevReturnQty = Number(prevDetail?.returnQuantity ?? prevDetail?.rejectedQuantity ?? 0);
        const prevStatus = prevDetail?.returnReplacementStatus;

        // Item was only returned in previous GRN (without replacement requested)
        const isReturnOnly = prevStatus === 'RETURN_REQUESTED';

        // Check completion conditions:
        // 1. received quantity >= ordered quantity
        // 2. return_requested items where received quantity + return quantity >= ordered quantity
        const isFullyReceived =
          alreadyReceivedQty >= orderedQty &&
          !isDirectTarget &&
          !(prevDetail && prevStatus === 'RETURN_REPLACEMENT_REQUESTED');

        const isReturnCompleted =
          isReturnOnly && alreadyReceivedQty + prevReturnQty >= orderedQty;

        const isCompleted =
          !isDirectTarget &&
          !(prevDetail && prevStatus === 'RETURN_REPLACEMENT_REQUESTED') &&
          (isFullyReceived || isReturnCompleted || String(d.status).toUpperCase() === 'CLOSED');

        let initialApproved = 0;
        let initialReturn = 0;
        let lineReturnGrnDetailId = null;
        let lineStatus = 'RETURN_REQUESTED';

        if (isCompleted) {
          initialApproved = 0;
          initialReturn = 0;
          lineReturnGrnDetailId = null;
        } else if (isDirectTarget) {
          // Return replacement item: replacement goods are now received in Approved Quantity
          const replQty =
            returnQtyParam !== null && returnQtyParam !== undefined
              ? Number(returnQtyParam)
              : Number(prevDetail?.returnQuantity ?? prevDetail?.rejectedQuantity ?? remaining ?? orderedQty);
          initialApproved = replQty;
          initialReturn = 0;
          lineReturnGrnDetailId = returnGrnDetailId ? Number(returnGrnDetailId) : (prevDetail?.id ? Number(prevDetail.id) : null);
          lineStatus = 'RETURN_REQUESTED';
        } else if (prevDetail && prevStatus === 'RETURN_REPLACEMENT_REQUESTED') {
          // Other replacement item from the same previous GRN
          initialApproved = Number(prevDetail.returnQuantity || prevDetail.rejectedQuantity || 0);
          initialReturn = 0;
          lineReturnGrnDetailId = Number(prevDetail.id);
          lineStatus = 'RETURN_REQUESTED';
        } else if (remaining > 0) {
          // Unreceived item from PO
          initialApproved = remaining;
          initialReturn = 0;
          lineReturnGrnDetailId = null;
          lineStatus = 'RETURN_REQUESTED';
        } else {
          initialApproved = 0;
          initialReturn = 0;
          lineReturnGrnDetailId = null;
          lineStatus = 'RETURN_REQUESTED';
        }

        return {
          id: d.id || index + 1,
          purchaseOrderDetailId: d.id,
          purchaseOrderId: d.purchaseOrderId || normalizedPo.id,
          poCode: d.poCode || normalizedPo.poCode,
          rawMaterialId: d.rawMaterialId,
          itemName: d.rawMaterialName || d.itemName || `Item #${d.rawMaterialId || index + 1}`,
          itemCode: d.rawMaterialCode || d.hsnCode || `RM-${d.rawMaterialId || index + 1}`,
          uomName: d.uomName || d.unitName || d.uom || 'Unit',
          orderedQty: orderedQty,
          receivedQuantity: alreadyReceivedQty,
          recQty: initialApproved,
          returnQty: initialReturn,
          returnReplacementStatus: lineStatus,
          approvedQty: initialApproved,
          isPoDetailClosed: false,
          remarks: d.remarks || '',
          isReplacementItem: !isCompleted && (isDirectTarget || Boolean(prevDetail && prevStatus === 'RETURN_REPLACEMENT_REQUESTED')),
          isCompleted: isCompleted,
          returnGrnDetailId: lineReturnGrnDetailId,
          oldGrnId: oldGrnId ? Number(oldGrnId) : undefined,
        };
      });
      setItems(mappedItems);
    } catch (err) {
      console.error('Failed to load PO for GRN generation:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Failed to load purchase order.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoData();
  }, [poIds.join(','), oldGrnId, returnGrnDetailId, grnCodeParam]);

  const shippingAddress = useMemo(() => {
    const s = po?.shipTo;
    if (s) {
      return [
        s.addressEnglish || s.addressline1 || s.address,
        s.addressline2,
        s.cityName,
        s.stateName,
        s.pincode,
      ]
        .filter(Boolean)
        .join(', ');
    }
    return po?.outletName || 'Outlet Address';
  }, [po]);

  const billingAddress = useMemo(() => {
    const b = po?.billTo;
    if (b) {
      return [
        b.addressLine1 || b.address,
        b.addressLine2,
        b.cityName,
        b.stateName,
        b.pincode,
      ]
        .filter(Boolean)
        .join(', ');
    }
    return po?.vendorName || 'Vendor Address';
  }, [po]);


  const toggleItemRemarks = (itemId) => {
    setOpenRemarksMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleItemRemarksChange = (itemId, val) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, remarks: val };
        }
        return item;
      })
    );
  };

  const handleApprovedQtyChange = (itemId, val) => {
    if (val !== '' && Number(val) < 0) {
      toast.error('Negative numbers are not allowed.');
      return;
    }
    const numericVal = val === '' ? '' : Math.max(0, Number(val));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            approvedQty: numericVal,
          };
        }
        return item;
      })
    );
  };

  const handleReturnQtyChange = (itemId, val) => {
    if (val !== '' && Number(val) < 0) {
      toast.error('Negative numbers are not allowed.');
      return;
    }
    const numericVal = val === '' ? '' : Math.max(0, Number(val));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const retVal = Number(numericVal) || 0;
          return {
            ...item,
            returnQty: numericVal,
            returnReplacementStatus: retVal > 0 ? (item.returnReplacementStatus || 'RETURN') : (item.returnReplacementStatus || 'RETURN'),
          };
        }
        return item;
      })
    );
  };

  const handleReturnStatusChange = (itemId, val) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, returnReplacementStatus: val };
        }
        return item;
      })
    );
  };

  const handleCloseItemChange = (itemId, isChecked) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, isPoDetailClosed: isChecked };
        }
        return item;
      })
    );
  };

  const handleGenerateGRN = async () => {
    if (!po) {
      toast.error('Purchase order details not loaded.');
      return;
    }

    if (!grnDate) {
      toast.error('Please specify a valid GRN Date.');
      return;
    }

    const todayStr = getTodayInputDate();
    if (grnDate < todayStr) {
      toast.error('Past date is not allowed for GRN Date.');
      return;
    }

    if (!invoiceFile) {
      toast.error('Please upload an invoice file.');
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (Number(item.approvedQty) < 0 || Number(item.returnQty) < 0) {
        toast.error(`Negative quantities not allowed for ${item.itemName}.`);
        return;
      }
    }

    // Filter out completed items and items without quantities
    const activeItems = items.filter(
      (item) => !item.isCompleted && (Number(item.approvedQty) > 0 || Number(item.returnQty) > 0 || item.isReplacementItem || item.isPoDetailClosed)
    );

    if (activeItems.length === 0) {
      toast.error('No pending items with quantities to generate GRN.');
      return;
    }

    // Validate details
    const detailsPayload = activeItems.map((item) => {
      const apprQty = Number(item.approvedQty) || 0;
      const retQty = Number(item.returnQty) || 0;
      const itemReturnGrnDetailId = item.returnGrnDetailId
        ? Number(item.returnGrnDetailId)
        : (returnGrnDetailId && item.isReplacementItem ? Number(returnGrnDetailId) : null);

      return {
        acceptedQuantity: apprQty,
        purchaseOrderDetailId: Number(item.purchaseOrderDetailId || item.id || 0),
        returnGrnDetailId: itemReturnGrnDetailId,
        returnReplacementStatus: retQty > 0 ? (item.returnReplacementStatus || 'RETURN_REQUESTED') : null,
        returnedQuantity: retQty,
        isPoDetailClosed: Boolean(item.isPoDetailClosed),
      };
    });

    if (detailsPayload.length === 0) {
      toast.error('No items found to generate GRN.');
      return;
    }

    const userId = Number(getUserIdFromToken() || 0);
    const orgId = Number(po.outletId || po.orgId || 0);
    const vendorId = Number(po.vendorId || 0);

    const formattedGrnDate = (() => {
      if (!grnDate) return '';
      const [y, m, d] = grnDate.split('-');
      if (!d || !m || !y) return grnDate;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    })();

    const subOutletId = selectedSubOutletId ? Number(selectedSubOutletId) : null;

    const effectivePoIds = (po.poIds && po.poIds.length > 0)
      ? po.poIds.map(Number)
      : (poIds && poIds.length > 0 ? poIds.map(Number) : (po.id ? [Number(po.id)] : []));

    const isMultiPo = effectivePoIds.length > 1;

    const grnRequest = {
      details: detailsPayload,
      grnDate: formattedGrnDate,
      orgId: orgId,
      purchaseOrderIds: effectivePoIds,
      remarks: remarks || '',
      subOutletId: subOutletId,
      userId: userId,
      vendorId: vendorId,
    };

    if (!isMultiPo) {
      grnRequest.purchaseOrderId = Number(effectivePoIds[0] || po.id || 0);
    }

    // Create multipart/form-data
    const formData = new FormData();

    // 1. Append File (array[file] in Swagger)
    if (invoiceFile instanceof File) {
      formData.append('File', invoiceFile);
    }

    // 2. Append request body part as application/json Blob
    formData.append(
      'request',
      new Blob([JSON.stringify(grnRequest)], { type: 'application/json' })
    );

    setGenerating(true);
    try {
      await createGrn(formData);
      toast.success('GRN generated successfully!');
      navigate('/inventory/grn-listing');
    } catch (err) {
      console.error('Failed to create GRN:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate GRN.';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (!canView || !canAdd) {
    return <AccessDenied pageTitle="Generate GRN" />;
  }

  if (loading) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Container>
    );
  }

  if (error || !po) {
    return (
      <Container>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen pb-10">
          <SectionCard className="mt-10 p-8 text-center">
            <p className="text-sm text-red-500 font-medium">{error || 'Purchase Order not found'}</p>
            <button
              type="button"
              onClick={() => navigate('/inventory/generate-grn')}
              className="mt-4 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white"
            >
              Back to Generate GRN
            </button>
          </SectionCard>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 min-h-screen pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 mt-1">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span>Inventory</span>
          <ChevronRight size={12} />
          <span
            onClick={() => navigate('/inventory/generate-grn')}
            className="cursor-pointer hover:text-[#084E92] transition"
          >
            Generate GRN
          </span>
          <ChevronRight size={12} />
          <span className="text-[#084E92] font-medium">GRN Details</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mt-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-semibold">
              Generate GRN
            </h1>
            <p className="text-[#43474F] mt-1 text-sm sm:text-base">
              Generate Goods Received Note for {po.poCode || `PO-${po.id}`}.
            </p>
          </div>
        </div>

        {/* Return & Replacement Banner */}
        {resolvedGrnCode || returnGrnDetailId ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mt-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <RotateCcw size={16} className="text-[#084E92] shrink-0" />
              <p className="text-xs font-semibold text-[#084E92]">
                Processing Return / Replacement {resolvedGrnCode ? `against GRN (${resolvedGrnCode})` : `(Detail #${returnGrnDetailId})`}
              </p>
            </div>
            {resolvedGrnCode ? (
              <span className="text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-0.5 rounded-md shrink-0 font-mono">
                {resolvedGrnCode}
              </span>
            ) : returnGrnDetailId ? (
              <span className="text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-0.5 rounded-md shrink-0 font-mono">
                Return Detail #{returnGrnDetailId}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* General Information Card */}
        <SectionCard className="mt-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100 mb-5">
            General Information
          </h2>

          {/* Row 1: PO Code & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                PO Code{po.poIds && po.poIds.length > 1 ? 's' : ''}
              </label>
              <div className="min-h-[44px] border border-gray-200 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 bg-[#F8FAFC]">
                {(po.poCodes || po.poCode || `PO-${po.id}`)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((code, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-xs font-bold text-[#084E92] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg inline-block"
                    >
                      {code}
                    </span>
                  ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={grnDate}
                min={getTodayInputDate()}
                onChange={(e) => setGrnDate(e.target.value)}
                className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-800 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]"
              />
            </div>
          </div>

          {/* Row 2: Outlet Name, Sub-outlet / Sublet & Invoice Upload */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Outlet Name</label>
              <div className="w-full h-11 border border-gray-200 rounded-xl px-3.5 flex items-center bg-white">
                <span className="text-sm font-medium text-gray-800 truncate">{po.outletName || po.outlet || `Outlet #${po.outletId}`}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Sub-outlet / Sublet <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <select
                value={selectedSubOutletId}
                onChange={(e) => setSelectedSubOutletId(e.target.value)}
                disabled={loadingSubOutlets}
                className="w-full h-11 border border-gray-200 rounded-xl px-3.5 text-sm font-medium text-gray-800 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92] transition cursor-pointer"
              >
                <option value="">None (Direct to {po.outletName || po.outlet || 'Outlet'})</option>
                {subOutlets.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subOutletName || sub.name || `Sub-outlet #${sub.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Invoice Upload <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <label className="w-full h-11 border border-dashed border-gray-300 rounded-xl px-3.5 flex items-center justify-between bg-white cursor-pointer hover:bg-gray-50 transition">
                  <span className={`text-sm truncate pr-6 ${invoiceFile ? 'font-semibold text-[#084E92]' : 'text-gray-400'}`}>
                    {invoiceFile ? invoiceFile.name : 'Upload invoice (PDF, Excel, Doc)...'}
                  </span>
                  <Upload size={16} className="text-[#084E92] shrink-0" />
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                    className="hidden"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  />
                </label>
                {invoiceFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInvoiceFile(null);
                    }}
                    title="Remove file"
                    className="absolute right-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 flex items-center justify-center transition cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Address Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Shipping Details (Outlet Address)
              </label>
              <div className="border border-gray-200 rounded-xl p-4 flex items-start gap-3 bg-white min-h-[76px] shadow-2xs">
                <MapPin size={18} className="text-[#084E92] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900">
                    {po?.shipTo?.companyNameEnglish || po?.outletName || 'Outlet'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {shippingAddress}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Billing Details (Vendor Address)
              </label>
              <div className="border border-gray-200 rounded-xl p-4 flex items-start gap-3 bg-white min-h-[76px] shadow-2xs">
                <Building2 size={18} className="text-[#084E92] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900">
                    {po?.vendorName || 'Vendor'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {billingAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelCls}>
              Remarks / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Received in good condition, checked by store manager"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-800 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]"
            />
          </div>
        </SectionCard>

        {/* Received Items */}
        <SectionCard className="mt-5 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Received Items</h2>
              <p className="text-xs text-gray-500 mt-0.5">Verify received goods against purchase order</p>
            </div>
            <span className="text-xs font-semibold text-[#084E92] bg-blue-50 border border-blue-100 rounded-xl px-3 py-1">
              Total: {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-gray-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="text-center px-1.5 py-2.5 w-8">#</th>
                  {po?.poIds && po.poIds.length > 1 && (
                    <th className="text-left px-2 py-2.5 w-32">PO Code</th>
                  )}
                  <th className="text-left px-2 py-2.5">Item Description</th>
                  <th className="text-center px-1 py-2.5 w-14">Unit</th>
                  <th className="text-right px-1.5 py-2.5 w-16">Ordered</th>
                  <th className="text-right px-1.5 py-2.5 w-16" title="Quantity already received in previous GRNs (read-only)">
                    Received
                  </th>
                  <th className="text-right px-1.5 py-2.5 w-20">
                    Approved <span className="text-red-500">*</span>
                  </th>
                  <th className="text-right px-1.5 py-2.5 w-16">Return</th>
                  <th className="text-left px-1.5 py-2.5 w-36">Return Status</th>
                  <th className="text-center px-1.5 py-2.5 w-20" title="Close PO if items are completed / short received">
                    <div className="flex items-center justify-center gap-1">
                      <span className="whitespace-nowrap">Close PO</span>
                      <input
                        type="checkbox"
                        checked={
                          items.filter((i) => !i.isCompleted).length > 0 &&
                          items.filter((i) => !i.isCompleted).every((i) => i.isPoDetailClosed)
                        }
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setItems((prev) =>
                            prev.map((item) =>
                              item.isCompleted ? item : { ...item, isPoDetailClosed: isChecked }
                            )
                          );
                        }}
                        className="w-3.5 h-3.5 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 cursor-pointer accent-[#084E92]"
                        title="Toggle Close PO for all items"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={(po?.poIds && po.poIds.length > 1 ? 1 : 0) + 9} className="px-4 py-12 text-center text-gray-400">
                      No items found on this order.
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[#F8FAFC]/70 transition-colors">
                      <td className="px-1.5 py-2 text-center text-gray-400 font-medium">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      {po?.poIds && po.poIds.length > 1 && (
                        <td className="px-2 py-2 text-left whitespace-nowrap">
                          <span className="font-mono text-[10px] font-semibold text-[#084E92] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block">
                            {item.poCode || `PO-${item.purchaseOrderId}`}
                          </span>
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="font-semibold text-[#084E92] text-xs truncate max-w-[160px]">
                              {item.itemName}
                            </span>
                            {item.isReplacementItem ? (
                              <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded shrink-0">
                                Replacement
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => toggleItemRemarks(item.id)}
                              title={openRemarksMap[item.id] ? 'Close remarks' : 'Add/Edit remarks'}
                              className={`p-0.5 rounded hover:bg-blue-50 transition cursor-pointer shrink-0 ${
                                item.remarks ? 'text-[#084E92]' : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <Pencil size={10} />
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
                            {item.itemCode}
                          </p>
                          {openRemarksMap[item.id] ? (
                            <div className="mt-1">
                              <input
                                type="text"
                                autoFocus
                                value={item.remarks || ''}
                                onChange={(e) => handleItemRemarksChange(item.id, e.target.value)}
                                placeholder="Add remarks..."
                                className="w-full max-w-[160px] h-6 border border-[#CBD5E1] rounded px-1.5 text-xs text-[#1E293B] outline-none focus:border-[#084E92] bg-white"
                              />
                            </div>
                          ) : item.remarks ? (
                            <p
                              onClick={() => toggleItemRemarks(item.id)}
                              title="Click to edit remarks"
                              className="text-[10px] text-gray-500 italic truncate max-w-[160px] cursor-pointer hover:text-gray-700 mt-0.5"
                            >
                              {item.remarks}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <span className="inline-block text-[11px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {item.uomName}
                        </span>
                      </td>
                      {/* Ordered Qty (Read-Only) */}
                      <td className="px-1.5 py-2 text-right">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800">
                          {item.orderedQty}
                        </span>
                      </td>
                      {/* Received Qty (Read-Only: from past GRNs) */}
                      <td className="px-1.5 py-2 text-right">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600">
                          {item.receivedQuantity}
                        </span>
                      </td>
                      {/* Approved Qty (Editable / Completed) */}
                      <td className="px-1.5 py-2 text-right">
                        {item.isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                            <CheckCircle2 size={10} />
                            Completed
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={item.approvedQty}
                            onChange={(e) => handleApprovedQtyChange(item.id, e.target.value)}
                            className="w-16 h-7 border border-gray-200 rounded-md px-1 text-right font-bold text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 transition"
                          />
                        )}
                      </td>
                      {/* Return Qty (Editable / Completed) */}
                      <td className="px-1.5 py-2 text-right">
                        {item.isCompleted ? (
                          <span className="text-gray-400 text-xs font-medium">—</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={item.returnQty}
                            onChange={(e) => handleReturnQtyChange(item.id, e.target.value)}
                            className="w-14 h-7 border border-gray-200 rounded-md px-1 text-right font-bold text-xs text-gray-900 bg-white outline-none focus:border-[#084E92] focus:ring-1 focus:ring-[#084E92]/20 transition"
                          />
                        )}
                      </td>
                      {/* Return Status */}
                      <td className="px-1.5 py-2 text-left w-36">
                        {item.isCompleted ? (
                          <span className="text-gray-400 text-xs pl-1">—</span>
                        ) : (
                          <select
                            value={item.returnReplacementStatus || 'RETURN_REQUESTED'}
                            onChange={(e) => handleReturnStatusChange(item.id, e.target.value)}
                            disabled={!Number(item.returnQty)}
                            className={`h-7 w-full border rounded-md px-1 text-[11px] font-semibold outline-none transition ${
                              Number(item.returnQty) > 0
                                ? 'border-amber-300 bg-amber-50/50 text-amber-900 cursor-pointer focus:border-[#084E92]'
                                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <option value="RETURN_REQUESTED">Return</option>
                            <option value="RETURN_REPLACEMENT_REQUESTED">Return & Replace</option>
                          </select>
                        )}
                      </td>
                      {/* Close PO Checkbox */}
                      <td className="px-1.5 py-2 text-center whitespace-nowrap">
                        {item.isCompleted ? (
                          <span className="text-gray-400 text-xs font-medium">—</span>
                        ) : (
                          <label className="inline-flex items-center gap-1 cursor-pointer justify-center select-none" title="Close this PO line item">
                            <input
                              type="checkbox"
                              checked={Boolean(item.isPoDetailClosed)}
                              onChange={(e) => handleCloseItemChange(item.id, e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-[#084E92] focus:ring-[#084E92] border-gray-300 cursor-pointer accent-[#084E92]"
                            />
                            {item.isPoDetailClosed && (
                              <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded">
                                Closed
                              </span>
                            )}
                          </label>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate('/inventory/generate-grn')}
            disabled={generating}
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateGRN}
            disabled={generating || !canAdd}
            title={!canAdd ? 'You do not have permission to generate GRN' : 'Generate GRN'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white bg-[#084E92] text-sm font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition disabled:opacity-60 shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating GRN...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Generate GRN
              </>
            )}
          </button>
        </div>
      </div>
    </Container>
  );
};

export default GenerateGRNDetail;

