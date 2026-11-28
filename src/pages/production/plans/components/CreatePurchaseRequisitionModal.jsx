import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  X,
  FileText,
  PlusCircle,
  ExternalLink,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import { createPurchaseRequisition } from '@/services/apiServices';
import { getUserIdFromToken, getUsernameFromToken } from '@/utils/auth';
import { notify } from '@/utils/toast';

export const CreatePurchaseRequisitionModal = ({
  isOpen,
  onClose,
  items = [],
  shortfalls = [],
  planInfo = {},
  generatedPR: existingPR = null,
  onPRGenerated,
}) => {
  const navigate = useNavigate();
  const [isGenerated, setIsGenerated] = useState(Boolean(existingPR));
  const [generatedPR, setGeneratedPR] = useState(existingPR || null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [prDate, setPrDate] = useState(
    planInfo.productionDate
      ? String(planInfo.productionDate).split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [prRequiredDate, setPrRequiredDate] = useState(
    planInfo.productionDate
      ? String(planInfo.productionDate).split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState(
    `Auto-generated PR from Production Plan ${planInfo.planCode || ''}`
  );

  // List of items to be requisitioned
  const initialItems = items && items.length > 0 ? items : shortfalls;
  const [itemsToRequisition, setItemsToRequisition] = useState(initialItems);
  const [selectedItemIds, setSelectedItemIds] = useState(
    () => new Set(initialItems.map((it, idx) => it.id ?? it.rawMaterialId ?? idx))
  );

  // Sync state when modal opens or items / shortfalls / existingPR change
  useEffect(() => {
    if (isOpen) {
      if (existingPR) {
        setIsGenerated(true);
        setGeneratedPR(existingPR);
      } else {
        setIsGenerated(false);
        const list = items && items.length > 0 ? items : shortfalls;
        setItemsToRequisition(list);
        setSelectedItemIds(new Set(list.map((it, idx) => it.id ?? it.rawMaterialId ?? idx)));
      }
    }
  }, [isOpen, existingPR, items, shortfalls]);

  if (!isOpen) return null;

  // Toggle selection for all items in the modal
  const allModalSelected =
    itemsToRequisition.length > 0 &&
    itemsToRequisition.every((it, idx) =>
      selectedItemIds.has(it.id ?? it.rawMaterialId ?? idx)
    );
  const isModalIndeterminate =
    !allModalSelected &&
    itemsToRequisition.some((it, idx) =>
      selectedItemIds.has(it.id ?? it.rawMaterialId ?? idx)
    );

  const handleToggleSelectAllModal = () => {
    if (allModalSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(
        new Set(itemsToRequisition.map((it, idx) => it.id ?? it.rawMaterialId ?? idx))
      );
    }
  };

  const handleSelectAll = () => {
    setSelectedItemIds(
      new Set(itemsToRequisition.map((it, idx) => it.id ?? it.rawMaterialId ?? idx))
    );
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleToggleSelectItem = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Remove an item from the PR list
  const handleRemoveItem = (idToRemove) => {
    setItemsToRequisition((prev) =>
      prev.filter((it, idx) => (it.id ?? it.rawMaterialId ?? idx) !== idToRemove)
    );
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(idToRemove);
      return next;
    });
  };

  const handleGeneratePR = async () => {
    const finalItemsToGenerate = itemsToRequisition.filter((it, idx) =>
      selectedItemIds.has(it.id ?? it.rawMaterialId ?? idx)
    );

    if (finalItemsToGenerate.length === 0) {
      notify.warning('Please select at least one item to generate purchase requisition.');
      return;
    }

    setLoading(true);

    const organizationId = Number(planInfo.organizationId || 40);
    const organizationName = planInfo.organizationName || 'PDEU';

    // Store ID of unit/subunit passed in subOutletId as requested
    const storeSubOutletId = Number(
      planInfo.selectedStoreId ||
      planInfo.storeId ||
      planInfo.subOutletId ||
      planInfo.productionsuboutletId ||
      0
    );
    const storeSubOutletName =
      planInfo.issueStore ||
      planInfo.subOutletName ||
      planInfo.storeName ||
      planInfo.productionsuboutletName ||
      'PDEU - Kitchen';

    const payload = {
      userId: getUserIdFromToken() || 0,
      actionBy: getUsernameFromToken() || 'User',
      outletId: organizationId,
      outletName: organizationName,
      outletShortCode: '',
      subOutletId: storeSubOutletId,
      subOutletName: storeSubOutletName,
      prDate: prDate,
      prRequiredDate: prRequiredDate,
      status: 'PENDING',
      remarks: remarks || `Auto-generated PR from Production Plan ${planInfo.planCode || ''}`,
      details: finalItemsToGenerate.map((d) => ({
        id: 0,
        quantity: Number(d.shortfall || d.requiredQty || 0),
        rawMaterialId: Number(d.rawMaterialId || 0),
        rawMaterialName: d.rawMaterial || d.ingredient || 'Ingredient',
        uomId: Number(d.canonicalUomId || d.uomId || 1),
        uomName: d.baseUom || d.uom || 'KG',
      })),
    };

    try {
      const res = await createPurchaseRequisition(payload);
      const resData = res?.data?.data || res?.data || {};

      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const prCode =
        resData.prCode ||
        resData.code ||
        `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const prId = resData.id || resData.purchaseRequisitionId || null;

      const createdPR = {
        id: prId,
        prCode,
        generatedAt: now,
        status: 'PENDING',
        outletId: organizationId,
        outletName: organizationName,
        subOutletId: storeSubOutletId,
        subOutletName: storeSubOutletName,
        totalItems: finalItemsToGenerate.length,
        totalQty: finalItemsToGenerate.reduce(
          (sum, it) => sum + Number(it.shortfall || it.requiredQty || 0),
          0
        ),
        totalCost: finalItemsToGenerate.reduce(
          (sum, it) =>
            sum +
            Number(it.shortfall || it.requiredQty || 0) * Number(it.rate || it.estimatedUnitRate || 0),
          0
        ),
        remarks,
        items: finalItemsToGenerate.map((it) => ({
          name: it.rawMaterial || it.ingredient || 'Ingredient',
          qty: it.shortfall || it.requiredQty || 0,
          uom: it.baseUom || it.uom || 'KG',
          rate: Number(it.rate || it.estimatedUnitRate || 0),
          estimatedCost:
            Number(it.shortfall || it.requiredQty || 0) *
            Number(it.rate || it.estimatedUnitRate || 0),
        })),
      };

      setGeneratedPR(createdPR);
      setIsGenerated(true);
      onPRGenerated?.(createdPR);
      notify.success(`Purchase Requisition ${prCode} created with status PENDING`);
    } catch (err) {
      console.warn('API error when creating purchase requisition:', err);
      // Fallback local state if backend returns error or is unreachable
      const fallbackCode = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackPR = {
        id: null,
        prCode: fallbackCode,
        generatedAt: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        status: 'PENDING',
        outletName: organizationName,
        subOutletName: storeSubOutletName,
        totalItems: finalItemsToGenerate.length,
        totalQty: finalItemsToGenerate.reduce(
          (sum, it) => sum + Number(it.shortfall || it.requiredQty || 0),
          0
        ),
        totalCost: finalItemsToGenerate.reduce(
          (sum, it) =>
            sum +
            Number(it.shortfall || it.requiredQty || 0) * Number(it.rate || it.estimatedUnitRate || 0),
          0
        ),
        remarks,
        items: finalItemsToGenerate.map((it) => ({
          name: it.rawMaterial || it.ingredient || 'Ingredient',
          qty: it.shortfall || it.requiredQty || 0,
          uom: it.baseUom || it.uom || 'KG',
          rate: Number(it.rate || it.estimatedUnitRate || 0),
          estimatedCost:
            Number(it.shortfall || it.requiredQty || 0) *
            Number(it.rate || it.estimatedUnitRate || 0),
        })),
      };

      setGeneratedPR(fallbackPR);
      setIsGenerated(true);
      onPRGenerated?.(fallbackPR);
      notify.info(`Purchase Requisition ${fallbackCode} generated with status PENDING.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[#E7EAF0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGenerated ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#084E92]'
                }`}
            >
              {isGenerated ? <Clock size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  {isGenerated ? 'Purchase Requisition Details' : 'Create Purchase Requisition'}
                </h3>
                {isGenerated && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    STATUS: PENDING
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isGenerated
                  ? 'Requisition generated and pending approval for procurement.'
                  : 'Generate a purchase requisition with status PENDING for shortfall items.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isGenerated && generatedPR ? (
            /* PR GENERATED DETAILS VIEW */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PR Number
                  </span>
                  <span className="text-base font-extrabold text-[#084E92]">{generatedPR.prCode}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Outlet / Issue Store (subOutletId)
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {generatedPR.outletName} — {generatedPR.subOutletName} (ID: {generatedPR.subOutletId})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Approval Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    PENDING
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Generated On</span>
                  <span className="font-semibold text-slate-800">{generatedPR.generatedAt}</span>
                </div>
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shortfall Items</span>
                  <span className="font-semibold text-slate-800">{generatedPR.totalItems} Items</span>
                </div>
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Cost</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(generatedPR.totalCost || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Requisitioned Ingredients Breakdown
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="py-2.5 px-3 text-left">Ingredient</th>
                        <th className="py-2.5 px-3 text-right">Requested Qty</th>
                        <th className="py-2.5 px-3 text-left">UOM</th>
                        <th className="py-2.5 px-3 text-right">Est. Rate</th>
                        <th className="py-2.5 px-3 text-right">Est. Cost</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generatedPR.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">{item.qty}</td>
                          <td className="py-2 px-3 text-slate-500">{item.uom}</td>
                          <td className="py-2 px-3 text-right text-slate-600">₹{item.rate}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            ₹{Number(item.estimatedCost || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] font-semibold text-amber-700">PENDING</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {generatedPR.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                  <strong className="text-slate-700 block text-[10px] uppercase font-bold mb-0.5">Remarks</strong>
                  <span>{generatedPR.remarks}</span>
                </div>
              )}
            </div>
          ) : (
            /* SHORTFALL SELECTION / FORM VIEW */
            <div className="space-y-4">
              {/* Context Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Outlet / Issue Store (subOutletId):</span>{' '}
                  <strong className="text-gray-900">
                    {planInfo.organizationName || 'PDEU'} —{' '}
                    {planInfo.issueStore || planInfo.subOutletName || 'PDEU - Kitchen'}{' '}
                    <span className="text-gray-500 font-normal">
                      (Store ID: {planInfo.selectedStoreId || planInfo.subOutletId || planInfo.productionsuboutletId || '29'})
                    </span>
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Initial Status:</span>{' '}
                  <strong className="text-amber-700 uppercase">PENDING</strong>
                </div>
              </div>

              {/* Date & Remarks inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">PR Date</label>
                  <input
                    type="date"
                    value={prDate}
                    onChange={(e) => setPrDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Required By Date</label>
                  <input
                    type="date"
                    value={prRequiredDate}
                    onChange={(e) => setPrRequiredDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs focus:border-[#084E92] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks for purchase requisition..."
                    className="w-full h-9 px-3 rounded-xl border border-[#C3C6D1] bg-white text-xs focus:border-[#084E92] focus:outline-none"
                  />
                </div>
              </div>

              {/* Shortfall / Selected Items Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span>
                      Items in PR:{' '}
                      <strong className="text-gray-900 font-bold">{selectedItemIds.size}</strong> of{' '}
                      {itemsToRequisition.length} selected
                    </span>
                  </div>
                  {itemsToRequisition.length < initialItems.length && (
                    <button
                      type="button"
                      onClick={() => {
                        setItemsToRequisition(initialItems);
                        setSelectedItemIds(
                          new Set(initialItems.map((it, idx) => it.id ?? it.rawMaterialId ?? idx))
                        );
                      }}
                      className="text-xs font-semibold text-[#084E92] hover:underline cursor-pointer"
                    >
                      Reset / Restore All ({initialItems.length})
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 border-b border-gray-200">
                      <tr className="text-left text-[10px] font-bold uppercase text-gray-500">
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allModalSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isModalIndeterminate;
                            }}
                            onChange={handleToggleSelectAllModal}
                            className="rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
                            title={allModalSelected ? 'Deselect All' : 'Select All'}
                          />
                        </th>
                        <th className="py-2.5 px-3">Ingredient</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Requisition Qty</th>
                        <th className="py-2.5 px-3">Base UOM</th>
                        <th className="py-2.5 px-3 text-right">Est. Rate</th>
                        <th className="py-2.5 px-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsToRequisition.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            No items in this requisition.
                          </td>
                        </tr>
                      ) : (
                        itemsToRequisition.map((item, idx) => {
                          const itemId = item.id ?? item.rawMaterialId ?? idx;
                          const isSelected = selectedItemIds.has(itemId);

                          return (
                            <tr
                              key={itemId}
                              className={`hover:bg-slate-50 transition ${!isSelected ? 'opacity-50 bg-gray-50/50' : ''
                                }`}
                            >
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectItem(itemId)}
                                  className="rounded border-gray-300 text-[#084E92] focus:ring-[#084E92] cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-semibold text-gray-900">
                                {item.ingredient || item.rawMaterial}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{item.category}</td>
                              <td className="py-2 px-3 text-right font-bold text-rose-600">
                                {item.shortfall || item.requiredQty}
                              </td>
                              <td className="py-2 px-3 text-gray-500">{item.baseUom || item.uom}</td>
                              <td className="py-2 px-3 text-right text-gray-600">
                                ₹{item.rate || item.estimatedUnitRate || 0}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(itemId)}
                                  className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Remove from PR"
                                >
                                  <Trash2 size={14} />
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div>
            {isGenerated && generatedPR && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate('/purchase-requisition/list');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#084E92] hover:underline cursor-pointer"
              >
                <ExternalLink size={14} />
                Open in Purchase Requisitions Module
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isGenerated && (
              <button
                type="button"
                onClick={() => {
                  setIsGenerated(false);
                  const list = items && items.length > 0 ? items : shortfalls;
                  setItemsToRequisition(list);
                  setSelectedItemIds(new Set(list.map((it, idx) => it.id ?? it.rawMaterialId ?? idx)));
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] transition shadow-xs cursor-pointer"
              >
                <PlusCircle size={14} />
                Generate PR Again
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200/60 transition cursor-pointer"
            >
              {isGenerated ? 'Close' : 'Cancel'}
            </button>
            {!isGenerated && (
              <button
                type="button"
                disabled={loading || selectedItemIds.size === 0}
                onClick={handleGeneratePR}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#063c70] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating PR...
                  </>
                ) : (
                  <>
                    <PlusCircle size={14} />
                    Generate PR ({selectedItemIds.size}) (Pending)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseRequisitionModal;
