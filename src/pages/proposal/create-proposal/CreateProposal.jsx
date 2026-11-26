import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import { toast } from 'sonner';

import { ProposalStepper } from './ProposalStepper';
import { StepBasicDetails } from './steps/StepBasicDetails';
import { StepAssets } from './steps/StepAssets';
import { StepShiftService } from './steps/StepShiftService';
import { StepManpower } from './steps/StepManpower';
import { StepOtherCost } from './steps/StepOtherCost';
import { StepTermsConditions } from './steps/StepTermsConditions';

import {
  PROPOSAL_STATUS,
  PROPOSAL_STEPS,
  INITIAL_BASIC_DETAILS,
  INITIAL_ASSETS,
  INITIAL_SHIFT_SERVICE,
  INITIAL_MANPOWER,
  INITIAL_OTHER_COSTS,
  INITIAL_TERMS,
  INITIAL_ATTACHMENTS,
  toApiDate,
  toInputDate,
  extractArray,
  buildShiftBulkItem,
} from './types';

import {
  saveProposal,
  getProposalById,
  getCompleteProposalById,
  saveProposalShiftsBulk,
  submitProposalForApproval,
  updateProposalStatus,
  approveProposal,
  saveManPowerBatch,
  saveAssetBatch,
  saveOtherCostBatch,
  getAssetsByProposalId,
  getManpowerByProposalId,
  getOtherCostsByProposalId,
  deleteOtherCost,
  getTermsByProposalId,
  saveTermsBatch,
} from '@/services/apiServices';

export const CreateProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isApprovalMode = searchParams.get('mode') === 'approval';
  const isEditMode = Boolean(id);

  const { canAdd, canEdit, canView, canApprove: canApproveProposal, isAdmin } = usePagePermissions([
    'Proposal',
    'Proposals',
    'Proposal Management',
  ]);

  const approvalPermissions = usePagePermissions([
    'Approve Proposal',
    'Proposal Approval',
    'Proposal Approve',
  ]);

  const canApprove = Boolean(
    isApprovalMode ||
    isAdmin ||
    canApproveProposal ||
    approvalPermissions.canApprove ||
    approvalPermissions.canEdit ||
    approvalPermissions.canAdd ||
    approvalPermissions.canView
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);
  const [proposalId, setProposalId] = useState(id ? Number(id) : null);

  // Proposal aggregated data
  const [basicDetails, setBasicDetails] = useState(INITIAL_BASIC_DETAILS);
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [shiftService, setShiftService] = useState(INITIAL_SHIFT_SERVICE);
  const [manpower, setManpower] = useState(INITIAL_MANPOWER);
  const [otherCosts, setOtherCosts] = useState(INITIAL_OTHER_COSTS);
  const [terms, setTerms] = useState(INITIAL_TERMS);
  const [attachments, setAttachments] = useState(INITIAL_ATTACHMENTS);
  const [specialNotes, setSpecialNotes] = useState('');
  const [costSharePercentages, setCostSharePercentages] = useState(() => {
    try {
      const key = id ? `proposal_cost_share_${id}` : 'proposal_cost_share_draft';
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { manpower: 0, assets: 0, overhead: 0 };
  });

  const handleUpdateCostSharePercentage = (key, val) => {
    const num = val === '' ? '' : Math.min(100, Math.max(0, Number(val) || 0));
    setCostSharePercentages((prev) => {
      const next = { ...prev, [key]: num };
      try {
        const storageKey = proposalId || id ? `proposal_cost_share_${proposalId || id}` : 'proposal_cost_share_draft';
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Screen states - default to true if editing so Step 1 does not mount prematurely
  const [pageLoading, setPageLoading] = useState(Boolean(id));
  const [savingStep, setSavingStep] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [updatingProposal, setUpdatingProposal] = useState(false);
  const [approvingProposal, setApprovingProposal] = useState(false);

  const currentStatus = String(basicDetails.status || '').toUpperCase().trim();
  const isPendingApproval =
    currentStatus === 'PENDING_APPROVAL' ||
    currentStatus === 'PENDING APPROVAL' ||
    currentStatus === 'SENT_FOR_APPROVAL' ||
    currentStatus === 'SENT FOR APPROVAL';
  const isSentForApproval =
    isPendingApproval ||
    (Boolean(currentStatus) && currentStatus !== 'DRAFT');

  // If edit mode or proposalId exists, fetch existing complete details in a single API call
  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    const fetchExistingProposal = async () => {
      setPageLoading(true);
      try {
        let res;
        try {
          res = await getCompleteProposalById(id);
        } catch (completeErr) {
          console.warn('getCompleteProposalById fallback to getProposalById:', completeErr);
          res = await getProposalById(id);
        }
        if (isCancelled) return;

        const resData = res?.data?.data ?? res?.data;
        if (!resData) return;

        const p = resData.proposal || resData;

        // 1. Allocate Proposal ID & Basic Details
        const finalProposalId = Number(p.id || id);
        setProposalId(finalProposalId);

        setBasicDetails({
          id: p.id,
          proposalNumber: p.proposalNumber || '',
          title: p.title || '',
          clientName: p.clientName || '',
          clientContactPerson: p.clientContactPerson || '',
          clientEmail: p.clientEmail || '',
          clientPhone: p.clientPhone || '',
          stateId: p.stateId ? String(p.stateId) : '',
          stateName: p.stateName || '',
          wageZone: p.wageZone || null,
          organizationId: p.organizationId ? String(p.organizationId) : '',
          organizationName: p.organizationName || '',
          organizationCode: p.organizationCode || '',
          subOutletId: p.subOutletId ? String(p.subOutletId) : '',
          subOutletName: p.subOutletName || '',
          subOutletCode: p.subOutletCode || '',
          defaultMaterialCenterId: p.defaultMaterialCenterId || null,
          defaultMaterialCenterName: p.defaultMaterialCenterName || '',
          defaultMaterialCenterCode: p.defaultMaterialCenterCode || '',
          proposalType: p.proposalType || 'INSTITUTIONAL',
          proposalTypeId:
            p.proposalTypeId != null
              ? Number(p.proposalTypeId)
              : p.proposalTypeMasterId != null
                ? Number(p.proposalTypeMasterId)
                : p.proposalType && typeof p.proposalType === 'object' && p.proposalType.id != null
                  ? Number(p.proposalType.id)
                  : null,
          status: p.status || 'DRAFT',
          proposalDate: toInputDate(p.proposalDate) || '',
          validityDate: toInputDate(p.validityDate) || '',
          foodPreference: p.foodPreference || 'SUBSIDIZED',
          paymentMode: p.paymentMode || 'CHEQUE',
          serviceStartDate: toInputDate(p.serviceStartDate) || '',
          serviceEndDate: toInputDate(p.serviceEndDate) || '',
          supplyDaysPerMonth:
            p.supplyDaysPerMonth != null
              ? p.supplyDaysPerMonth
              : resData?.supplyDaysPerMonth != null
                ? resData.supplyDaysPerMonth
                : 30,
          remarks: p.remarks || '',
          specialNotes: p.specialNotes || '',
        });

        if (p.specialNotes) {
          setSpecialNotes(p.specialNotes);
        }

        // 2. Allocate Shifts (Step 2)
        const shiftsList =
          (Array.isArray(p.shifts) && p.shifts.length > 0 && p.shifts) ||
          (Array.isArray(resData.shifts) && resData.shifts.map((s) => s.shift || s)) ||
          [];

        setShiftService((prev) => ({
          ...prev,
          supplyDaysPerMonth:
            p.supplyDaysPerMonth != null
              ? p.supplyDaysPerMonth
              : resData?.supplyDaysPerMonth != null
                ? resData.supplyDaysPerMonth
                : prev.supplyDaysPerMonth || 30,
          shifts: shiftsList,
          foodCostSummary: resData.foodCostSummary || null,
        }));

        // 3. Allocate Manpower (Step 3) from resData.commercialSummary.manpower
        const mpList =
          (Array.isArray(resData?.commercialSummary?.manpower) && resData.commercialSummary.manpower) ||
          (Array.isArray(resData?.manpower) && resData.manpower) ||
          (Array.isArray(resData?.manpowerList) && resData.manpowerList) ||
          (Array.isArray(p?.manpower) && p.manpower) ||
          [];

        const mappedMp = mpList.map((item, idx) => {
          const roleName = item.remarks || item.manpowerName || item.roleName || `Role ${idx + 1}`;
          const words = roleName.trim().split(/\s+/);
          const initials =
            words.length > 1
              ? (words[0][0] + words[1][0]).toUpperCase()
              : roleName.substring(0, 2).toUpperCase() || 'RO';
          const headcount = Number(item.headCount ?? item.headcount ?? 1);
          const basicSalary = Number(item.monthlySalary ?? item.basicSalary ?? 0);
          const totalCost = Number(((item.headCount ?? 1) * (item.monthlySalary ?? 0)).toFixed(2));
          const dailySalary = Number(((item.dailyWageRate ?? (basicSalary / 26))).toFixed(2));

          return {
            id: item.id || idx + 1,
            proposalManpowerId: item.id,
            isSavedInDb: true,
            manpowerMasterId: item.manpowerId || item.id,
            roleName,
            initials,
            headcount,
            basicSalary,
            dailySalary,
            totalCost,
            overtimeAllowance: item.overtimeAllowance || 0,
            proposalShiftId: item.proposalShiftId || 0,
            remarks: item.remarks || roleName,
          };
        });

        setManpower({
          stateId: p.stateId ? String(p.stateId) : '',
          roles: mappedMp,
        });

        // 4. Allocate Assets (Step 2)
        try {
          if (id && Number(id) > 0) {
            const assetRes = await getAssetsByProposalId(id);
            const rawAssetList = extractArray(assetRes);
            const assetList =
              (Array.isArray(rawAssetList) && rawAssetList.length > 0 && rawAssetList) ||
              (Array.isArray(resData?.commercialSummary?.assets) && resData.commercialSummary.assets) ||
              (Array.isArray(resData?.assets) && resData.assets) ||
              (Array.isArray(p?.assets) && p.assets) ||
              [];

            if (Array.isArray(assetList) && assetList.length > 0) {
              setAssets(
                assetList.map((item, idx) => ({
                  id: item.id || idx + 1,
                  proposalAssetId: item.id,
                  isSavedInDb: true,
                  assetId: Number(item.assetId || 0),
                  assetCode: item.assetCode || `AST-${item.assetId}`,
                  assetName: item.assetName || item.itemName || item.remarks || `Asset #${item.assetId}`,
                  categoryName: item.categoryName || '',
                  quantity: Number(item.quantity ?? 1),
                  price: Number(item.price ?? 0),
                  totalCost: Number(item.totalCost ?? ((item.quantity ?? 1) * (item.price ?? 0))),
                  remarks: item.remarks || '',
                  proposalId: Number(item.proposalId || id),
                }))
              );
            }
          }
        } catch (assetErr) {
          console.warn('Could not load assets by proposal id:', assetErr);
        }

        // 5. Allocate Other Costs (Step 4)
        try {
          if (id && Number(id) > 0) {
            const ocRes = await getOtherCostsByProposalId(id);
            const serverOc = extractArray(ocRes);
            if (Array.isArray(serverOc) && serverOc.length > 0) {
              setOtherCosts(
                serverOc.map((item, idx) => {
                  const isClient = item.responsibility === 'CLIENT';
                  return {
                    id: item.id || idx + 1,
                    proposalOtherCostId: item.id,
                    isSavedInDb: true,
                    costTypeId: Number(item.costTypeId || 0),
                    costType: item.costFactor || item.costTypeName || 'General',
                    costFactor: item.costFactor || '',
                    calculationBasis: item.calculationBasis || 'FIXED_MONTHLY',
                    isClient,
                    isServiceProvider: !isClient,
                    responsibility: item.responsibility || (isClient ? 'CLIENT' : 'SERVICE_PROVIDER'),
                    quantity: isClient ? 0 : Number(item.quantity ?? 1),
                    price: isClient ? 0 : Number(item.price ?? 0),
                    totalCost: isClient ? 0 : Number(item.totalCost ?? 0),
                    serviceProviderCost: isClient ? 0 : Number(item.totalCost ?? 0),
                    startDate: item.fromDate || '',
                    endDate: item.toDate || '',
                    fromDate: item.fromDate || '',
                    toDate: item.toDate || '',
                    remarks: item.remarks || '',
                    proposalId: Number(item.proposalId || id),
                  };
                })
              );
            } else {
              const ocList =
                (Array.isArray(resData?.commercialSummary?.otherCosts) && resData.commercialSummary.otherCosts) ||
                (Array.isArray(resData?.otherCosts) && resData.otherCosts) ||
                (Array.isArray(p?.otherCosts) && p.otherCosts) ||
                [];
              if (ocList.length > 0) setOtherCosts(ocList);
            }
          } else {
            const ocList =
              (Array.isArray(resData?.commercialSummary?.otherCosts) && resData.commercialSummary.otherCosts) ||
              (Array.isArray(resData?.otherCosts) && resData.otherCosts) ||
              (Array.isArray(p?.otherCosts) && p.otherCosts) ||
              [];
            if (ocList.length > 0) setOtherCosts(ocList);
          }
        } catch (ocErr) {
          const ocList =
            (Array.isArray(resData?.commercialSummary?.otherCosts) && resData.commercialSummary.otherCosts) ||
            (Array.isArray(resData?.otherCosts) && resData.otherCosts) ||
            (Array.isArray(p?.otherCosts) && p.otherCosts) ||
            [];
          if (ocList.length > 0) setOtherCosts(ocList);
        }

        // 6. Allocate Terms & Attachments
        try {
          const termsRes = await getTermsByProposalId(id);
          const tData = termsRes?.data?.data ?? termsRes?.data;
          const serverTerms = Array.isArray(tData)
            ? tData
            : Array.isArray(tData?.content)
            ? tData.content
            : [];
          if (serverTerms.length > 0) {
            setTerms(
              serverTerms.map((item, idx) => ({
                id: item.id || idx + 1,
                termTitle: item.termTitle || item.term || item.title || '',
                termDescription: item.termDescription || item.details || item.description || '',
                term: item.termTitle || item.term || item.title || '',
                details: item.termDescription || item.details || item.description || '',
                isMandatory: item.isMandatory !== undefined ? Boolean(item.isMandatory) : true,
                sequence: item.sequence || idx + 1,
                termMasterId: item.termMasterId || 0,
                proposalId: Number(id),
                userId: item.userId || 0,
              }))
            );
          } else {
            const termsList = resData?.terms || p?.terms || resData?.termsAndConditions || [];
            if (Array.isArray(termsList) && termsList.length > 0) {
              setTerms(termsList);
            }
          }
        } catch (termErr) {
          const termsList = resData?.terms || p?.terms || resData?.termsAndConditions || [];
          if (Array.isArray(termsList) && termsList.length > 0) {
            setTerms(termsList);
          }
        }

        const attachList = resData?.attachments || p?.attachments || resData?.proposalAttachments || [];
        if (Array.isArray(attachList) && attachList.length > 0) {
          setAttachments(attachList);
        }

        // Restore Client Cost Share Percentages
        try {
          const storageKey = id ? `proposal_cost_share_${id}` : 'proposal_cost_share_draft';
          const saved = localStorage.getItem(storageKey);
          const parsed = saved ? JSON.parse(saved) : {};
          setCostSharePercentages({
            manpower: Number(resData?.manpowerClientPercentage ?? p?.manpowerClientPercentage ?? parsed?.manpower ?? 0),
            assets: Number(resData?.assetClientPercentage ?? p?.assetClientPercentage ?? parsed?.assets ?? 0),
            overhead: Number(resData?.overheadClientPercentage ?? p?.overheadClientPercentage ?? parsed?.overhead ?? 0),
          });
        } catch {}

        // 7. Navigate directly to currentStep received from the complete proposal
        const targetStep = Number(p.currentStep || resData.currentStep);
        if (targetStep && targetStep >= 1 && targetStep <= 6) {
          setCurrentStep(targetStep);
          setMaxCompletedStep((prev) => Math.max(prev, targetStep));
        }
      } catch (err) {
        console.error('Failed to load proposal details:', err);
      } finally {
        if (!isCancelled) {
          setPageLoading(false);
        }
      }
    };

    fetchExistingProposal();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Current step metadata
  const currentStepMeta = PROPOSAL_STEPS.find((s) => s.id === currentStep) || PROPOSAL_STEPS[0];

  // Helper to persist basic details via POST /api/proposal/save
  const persistBasicDetails = async (isDraft = false, overrides = {}) => {
    const mappedShifts = (shiftService.shifts || []).map((s) => {
      const hc =
        s.headCount !== undefined && s.headCount !== null && s.headCount !== ''
          ? Number(s.headCount)
          : s.headcount !== undefined && s.headcount !== null && s.headcount !== ''
            ? Number(s.headcount)
            : 0;
      return {
        ...(s.id && typeof s.id === 'number' && s.id < 1000000000000 ? { id: s.id, proposalShiftId: s.id } : {}),
        shiftName: s.shiftName,
        mealTypeId: s.mealTypeId ? Number(s.mealTypeId) : null,
        mealStructureId: s.mealStructureId ? Number(s.mealStructureId) : null,
        headCount: hc,
        headcount: hc,
        guaranteedPax: s.guaranteedPax ? Number(s.guaranteedPax) : null,
        ratePerPlate: Number(s.ratePerPlate ?? s.rmCost ?? 0) || 0,
        rmCost: Number(s.rmCost ?? s.ratePerPlate ?? 0) || 0,
        manpowerCost: Number(s.manpowerCost ?? 0) || 0,
        overheadCost: Number(s.overheadCost ?? 0) || 0,
        assetCost: Number(s.dailyAssetCost ?? s.assetCost ?? 0) || 0,
        dailyAssetCost: Number(s.dailyAssetCost ?? s.assetCost ?? 0) || 0,
        inflationPercentage: Number(s.inflationPercentage ?? s.inflation ?? 0) || 0,
        inflation: Number(s.inflation ?? s.inflationPercentage ?? 0) || 0,
        profitPercentage: Number(s.profitPercentage ?? s.profit ?? 0) || 0,
        profit: Number(s.profit ?? s.profitPercentage ?? 0) || 0,
        totalCost: Number(s.totalCost ?? 0) || 0,
        proposedRate: Number(s.proposedRate ?? 0) || 0,
        quotedRate: Number(s.quotedRate ?? 0) || 0,
        contractedRate: Number(s.contractedRate ?? s.quotedRate ?? 0) || 0,
        sequence: Number(s.sequence || 1),
        items: s.items || [],
      };
    });

    const totalShiftHeadcount = mappedShifts.reduce((sum, s) => sum + s.headCount, 0);

    const effectiveSupplyDays =
      overrides.supplyDaysPerMonth !== undefined
        ? overrides.supplyDaysPerMonth
        : shiftService.supplyDaysPerMonth !== '' && shiftService.supplyDaysPerMonth != null
          ? shiftService.supplyDaysPerMonth
          : basicDetails.supplyDaysPerMonth !== '' && basicDetails.supplyDaysPerMonth != null
            ? basicDetails.supplyDaysPerMonth
            : 30;

    const effectiveStatus =
      overrides.status ||
      (basicDetails.status
        ? basicDetails.status
        : isDraft
          ? PROPOSAL_STATUS.DRAFT
          : PROPOSAL_STATUS.PENDING_APPROVAL);

    const effectiveProposalTypeId =
      basicDetails.proposalTypeId != null && basicDetails.proposalTypeId !== ''
        ? Number(basicDetails.proposalTypeId)
        : !isNaN(Number(basicDetails.proposalType)) && Number(basicDetails.proposalType) > 0
          ? Number(basicDetails.proposalType)
          : null;

    if (!effectiveProposalTypeId) {
      toast.error('Proposal type ID is required');
      throw new Error('Proposal type ID is required');
    }

    // Validation for phone and email
    const cleanPhone = (basicDetails.clientPhone || '').replace(/\D/g, '');
    const cleanEmail = (basicDetails.clientEmail || '').trim();

    if (!isDraft) {
      if (!cleanPhone) {
        toast.error('Mobile number is required');
        throw new Error('Mobile number is required');
      }
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        toast.error('Please enter a valid 10-digit mobile number');
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      if (!cleanEmail) {
        toast.error('Email is required');
        throw new Error('Email is required');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        toast.error('Please enter a valid email address');
        throw new Error('Please enter a valid email address');
      }
    } else {
      if (cleanPhone && (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone))) {
        toast.error('Please enter a valid 10-digit mobile number');
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        toast.error('Please enter a valid email address');
        throw new Error('Please enter a valid email address');
      }
    }

    const payload = {
      id: proposalId || 0,
      title: basicDetails.title || `${basicDetails.clientName || 'New'} Proposal`,
      proposalType: basicDetails.proposalType || 'INSTITUTIONAL',
      proposalTypeId: effectiveProposalTypeId,
      clientName: basicDetails.clientName?.trim() || '',
      clientContactPerson: basicDetails.clientContactPerson?.trim() || '',
      clientPhone: basicDetails.clientPhone?.trim() || '',
      clientEmail: basicDetails.clientEmail?.trim() || '',
      proposalDate: toApiDate(basicDetails.proposalDate),
      validityDate: toApiDate(basicDetails.validityDate),
      foodPreference: basicDetails.foodPreference || 'SUBSIDIZED',
      paymentMode: basicDetails.paymentMode || 'BANK_TRANSFER',
      serviceStartDate: toApiDate(basicDetails.serviceStartDate),
      serviceEndDate: toApiDate(basicDetails.serviceEndDate),
      stateId: Number(basicDetails.stateId) || 0,
      organizationId: Number(basicDetails.organizationId) || 0,
      subOutletId: Number(basicDetails.subOutletId) || 0,
      supplyDaysPerMonth: effectiveSupplyDays === '' ? 0 : Number(effectiveSupplyDays) || 0,
      remarks: basicDetails.remarks || '',
      specialNotes: specialNotes || basicDetails.specialNotes || '',
      terms: (Array.isArray(terms) ? terms : []).map((t, idx) => ({
        id: typeof t.id === 'number' && t.id > 0 && t.id < 1000000000000 ? t.id : 0,
        isMandatory: t.isMandatory !== undefined ? Boolean(t.isMandatory) : true,
        proposalId: Number(proposalId || 0),
        sequence: Number(t.sequence || idx + 1),
        termDescription: String(t.termDescription || t.details || t.description || ''),
        termMasterId: Number(t.termMasterId || 0),
        termTitle: String(t.termTitle || t.term || t.title || ''),
        userId: Number(localStorage.getItem('userId') || 1),
      })),
      manpowerClientPercentage: Number(costSharePercentages.manpower || 0),
      assetClientPercentage: Number(costSharePercentages.assets || 0),
      overheadClientPercentage: Number(costSharePercentages.overhead || 0),
      status: effectiveStatus,
      currentStep,
      userId: Number(localStorage.getItem('userId') || 1),
      headCount: totalShiftHeadcount || Number(basicDetails.headCount ?? basicDetails.headcount ?? 0) || 0,
      headcount: totalShiftHeadcount || Number(basicDetails.headcount ?? basicDetails.headCount ?? 0) || 0,
      shifts: mappedShifts,
      mealShifts: mappedShifts,
    };

    const res = await saveProposal(payload);
    if (res?.data?.success === false) {
      const errMsg = res?.data?.msg || 'Failed to save proposal';
      toast.error(errMsg);
      throw new Error(errMsg);
    }
    const saved = res?.data?.data ?? res?.data;
    const generatedId = saved?.id || saved?.proposalId || proposalId;
    if (generatedId && !proposalId) {
      setProposalId(generatedId);
    }
    if (saved?.status) {
      setBasicDetails((prev) => ({ ...prev, status: saved.status }));
    }
    return generatedId;
  };

  // Helper to persist shift details via bulk save shift API
  const persistShifts = async (targetId) => {
    const idToUse = targetId || proposalId;
    if (!idToUse) return;

    try {
      const summaryShifts = shiftService?.foodCostSummary?.shifts || [];
      const supplyDays = shiftService?.supplyDaysPerMonth || basicDetails?.supplyDaysPerMonth || 26;

      const mappedShifts = (shiftService.shifts || []).map((s) => {
        const matched = summaryShifts.find((sumS) => {
          const sId = sumS.shiftId ?? sumS.id;
          const tId = s.id ?? s.shiftId;
          if (sId && tId && Number(sId) === Number(tId)) return true;
          if (sumS.shiftName && s.shiftName && sumS.shiftName.trim().toLowerCase() === s.shiftName.trim().toLowerCase()) return true;
          return false;
        });
        return buildShiftBulkItem(s, matched, supplyDays);
      });

      const payload = {
        proposalId: Number(idToUse),
        shifts: mappedShifts,
      };

      await saveProposalShiftsBulk(idToUse, payload);
    } catch (err) {
      console.warn('Backend shift bulk save endpoint response:', err);
    }
  };

  // Helper to persist manpower batch via saveManPowerBatch
  const persistManpower = async (targetId) => {
    const idToUse = targetId || proposalId;
    if (!idToUse) return;

    try {
      const rolesList = manpower?.roles || [];
      if (!Array.isArray(rolesList) || rolesList.length === 0) return;

      const currentUserId = Number(
        (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 1
      );

      const payload = rolesList.map((r) => ({
        headCount: Number(r.headcount || 0),
        id: Number(r.proposalManpowerId || (r.isSavedInDb ? r.id : 0)),
        manpowerId: Number(r.manpowerMasterId || r.manpowerId || (typeof r.id === 'number' ? r.id : 0)),
        monthlySalary: Number(r.basicSalary || r.monthlySalary || 0),
        overtimeAllowance: Number(r.overtimeAllowance || 0),
        proposalId: Number(idToUse),
        proposalShiftId: Number(r.proposalShiftId || 0),
        remarks: String(r.remarks || r.roleName || ''),
        userId: currentUserId,
      }));

      const grossManpowerTotal = rolesList.reduce(
        (sum, r) =>
          sum +
          (Number(r.totalCost ?? (Number(r.headcount || 0) * Number(r.basicSalary || r.monthlySalary || 0))) || 0),
        0
      );
      const discountPercentage = Number(costSharePercentages?.manpower ?? 0) || 0;
      const deduction = (grossManpowerTotal * discountPercentage) / 100;
      const netTotal = Math.max(0, Number((grossManpowerTotal - deduction).toFixed(2)));

      await saveManPowerBatch(idToUse, payload, {
        discountPercentage,
        total: netTotal,
      });

      // Refresh manpower list so local state has the newly generated DB IDs
      try {
        const getRes = await getManpowerByProposalId(idToUse);
        const serverList = extractArray(getRes);
        if (Array.isArray(serverList) && serverList.length > 0) {
          const mapped = serverList.map((item, idx) => {
            const roleName =
              item.remarks ||
              item.manpowerName ||
              item.name ||
              item.roleName ||
              `Role ${idx + 1}`;
            const words = roleName.trim().split(/\s+/);
            const initials =
              words.length > 1
                ? (words[0][0] + words[1][0]).toUpperCase()
                : roleName.substring(0, 2).toUpperCase() || 'RO';
            const headcount = Number(item.headCount ?? item.headcount ?? 1);
            const basicSalary = Number(item.monthlySalary ?? item.basicSalary ?? 0);
            const totalCost = Number((headcount * basicSalary).toFixed(2));
            const dailySalary = Number((basicSalary / 26).toFixed(2));

            return {
              id: item.id || idx + 1,
              proposalManpowerId: item.id,
              isSavedInDb: true,
              manpowerMasterId: item.manpowerId || item.id,
              roleName,
              initials,
              headcount,
              basicSalary,
              dailySalary,
              totalCost,
              overtimeAllowance: item.overtimeAllowance || 0,
              proposalShiftId: item.proposalShiftId || 0,
              remarks: item.remarks || roleName,
            };
          });
          setManpower((prev) => ({ ...prev, roles: mapped }));
        }
      } catch (refErr) {
        console.warn('Could not refresh manpower after batch save:', refErr);
      }
    } catch (err) {
      console.warn('Backend manpower batch save response:', err);
    }
  };

  // Helper to persist assets batch via saveAssetBatch
  const persistAssets = async (targetId) => {
    const idToUse = targetId || proposalId;
    if (!idToUse) return;

    try {
      if (!Array.isArray(assets) || assets.length === 0) return;

      const currentUserId = Number(
        (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 1
      );

      const payload = assets.map((a) => {
        const qty = Number(a.quantity || 0);
        const pr = Number(a.price || 0);
        return {
          assetId: Number(a.assetId || 0),
          id: Number(a.proposalAssetId || (a.isSavedInDb ? a.id : 0)),
          price: pr,
          proposalId: Number(idToUse),
          quantity: qty,
          remarks: String(a.remarks || ''),
          totalCost: Number(a.totalCost ?? (qty * pr)),
          userId: currentUserId,
        };
      });

      const grossAssetTotal = assets.reduce(
        (sum, a) =>
          sum +
          (Number(a.totalCost ?? (Number(a.quantity || 0) * Number(a.price || 0))) || 0),
        0
      );
      const discountPercentage = Number(costSharePercentages?.assets ?? 0) || 0;
      const deduction = (grossAssetTotal * discountPercentage) / 100;
      const netTotal = Math.max(0, Number((grossAssetTotal - deduction).toFixed(2)));

      await saveAssetBatch(idToUse, payload, {
        discountPercentage,
        total: netTotal,
      });

      // Refresh assets list so local state has the newly generated DB IDs
      try {
        const getRes = await getAssetsByProposalId(idToUse);
        const serverList = extractArray(getRes);
        if (Array.isArray(serverList) && serverList.length > 0) {
          const mapped = serverList.map((item, idx) => ({
            id: item.id || idx + 1,
            proposalAssetId: item.id,
            isSavedInDb: true,
            assetId: Number(item.assetId || 0),
            assetCode: item.assetCode || `AST-${item.assetId}`,
            assetName: item.assetName || item.itemName || item.remarks || `Asset #${item.assetId}`,
            categoryName: item.categoryName || '',
            quantity: Number(item.quantity ?? 1),
            price: Number(item.price ?? 0),
            totalCost: Number(item.totalCost ?? ((item.quantity ?? 1) * (item.price ?? 0))),
            remarks: item.remarks || '',
            proposalId: Number(item.proposalId || idToUse),
          }));
          setAssets(mapped);
        }
      } catch (refErr) {
        console.warn('Could not refresh assets after batch save:', refErr);
      }
    } catch (err) {
      console.warn('Backend asset batch save response:', err);
    }
  };

  // Helper to persist other costs batch via saveOtherCostBatch
  const persistOtherCosts = async (targetId) => {
    const idToUse = targetId || proposalId;
    if (!idToUse) return;

    try {
      if (!Array.isArray(otherCosts) || otherCosts.length === 0) return;

      const currentUserId = Number(
        (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 1
      );

      const payload = otherCosts.map((c) => {
        const isClient = c.responsibility === 'CLIENT' || (c.isClient && !c.isServiceProvider);
        const itemCostTypeId = Number(c.costTypeId || 0);
        const rawId = typeof c.id === 'number' && c.id > 0 && c.id < 1000000000000 ? c.id : (c.proposalOtherCostId || 0);

        if (isClient) {
          return {
            calculationBasis: String(c.calculationBasis || 'FIXED_MONTHLY'),
            costFactor: String(c.costFactor || c.costType || ''),
            costTypeId: itemCostTypeId,
            fromDate: String(c.startDate || c.fromDate || basicDetails?.serviceStartDate || ''),
            id: rawId,
            proposalId: Number(idToUse),
            remarks: String(c.remarks || ''),
            responsibility: 'CLIENT',
            toDate: String(c.endDate || c.toDate || basicDetails?.serviceEndDate || ''),
            userId: currentUserId,
          };
        }

        const qty = Number(c.quantity === '' || c.quantity === undefined ? 1 : c.quantity) || 1;
        const pr = Number(c.price !== undefined && c.price !== '' ? c.price : (c.totalCost ?? 0)) || 0;
        const tot = Number(c.totalCost !== undefined && c.totalCost !== '' ? c.totalCost : (qty * pr)) || 0;

        return {
          calculationBasis: String(c.calculationBasis || 'FIXED_MONTHLY'),
          costFactor: String(c.costFactor || c.costType || ''),
          costTypeId: itemCostTypeId,
          fromDate: String(c.startDate || c.fromDate || basicDetails?.serviceStartDate || ''),
          id: rawId,
          price: pr,
          proposalId: Number(idToUse),
          quantity: qty,
          remarks: String(c.remarks || ''),
          responsibility: 'SERVICE_PROVIDER',
          toDate: String(c.endDate || c.toDate || basicDetails?.serviceEndDate || ''),
          totalCost: tot,
          userId: currentUserId,
        };
      });

      const grossOverheadTotal = otherCosts.reduce((sum, c) => {
        const isClient = c.responsibility === 'CLIENT' || (c.isClient && !c.isServiceProvider);
        if (isClient) return sum;
        const qty = Number(c.quantity === '' || c.quantity === undefined ? 1 : c.quantity) || 1;
        const pr = Number(c.price !== undefined && c.price !== '' ? c.price : (c.totalCost ?? 0)) || 0;
        const tot = Number(c.totalCost !== undefined && c.totalCost !== '' ? c.totalCost : (qty * pr)) || 0;
        return sum + tot;
      }, 0);

      const discountPercentage = Number(costSharePercentages?.overhead ?? 0) || 0;
      const deduction = (grossOverheadTotal * discountPercentage) / 100;
      const netTotal = Math.max(0, Number((grossOverheadTotal - deduction).toFixed(2)));

      await saveOtherCostBatch(idToUse, payload, {
        discountPercentage,
        total: netTotal,
      });

      // Refresh other costs list so local state has the newly generated DB IDs
      try {
        const getRes = await getOtherCostsByProposalId(idToUse);
        const serverList = extractArray(getRes);
        if (Array.isArray(serverList) && serverList.length > 0) {
          const mapped = serverList.map((item, idx) => {
            const isClientResp = item.responsibility === 'CLIENT';
            return {
              id: item.id || idx + 1,
              proposalOtherCostId: item.id,
              isSavedInDb: true,
              costTypeId: Number(item.costTypeId || 0),
              costType: item.costFactor || item.costTypeName || 'General',
              costFactor: item.costFactor || '',
              calculationBasis: item.calculationBasis || 'FIXED_MONTHLY',
              isClient: isClientResp,
              isServiceProvider: !isClientResp,
              responsibility: item.responsibility || (isClientResp ? 'CLIENT' : 'SERVICE_PROVIDER'),
              quantity: isClientResp ? 0 : Number(item.quantity ?? 1),
              price: isClientResp ? 0 : Number(item.price ?? 0),
              totalCost: isClientResp ? 0 : Number(item.totalCost ?? 0),
              serviceProviderCost: isClientResp ? 0 : Number(item.totalCost ?? 0),
              startDate: item.fromDate || '',
              endDate: item.toDate || '',
              fromDate: item.fromDate || '',
              toDate: item.toDate || '',
              remarks: item.remarks || '',
              proposalId: Number(item.proposalId || idToUse),
            };
          });
          setOtherCosts(mapped);
        }
      } catch (refErr) {
        console.warn('Could not refresh other costs after batch save:', refErr);
      }
    } catch (err) {
      console.warn('Backend other cost batch save response:', err);
    }
  };

  // Helper to persist terms batch via saveTermsBatch
  const persistTerms = async (targetId) => {
    const idToUse = targetId || proposalId;
    if (!idToUse) return;

    try {
      if (!Array.isArray(terms) || terms.length === 0) return;

      const currentUserId = Number(
        (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null) || 1
      );

      const payload = terms.map((t, idx) => ({
        id: typeof t.id === 'number' && t.id > 0 && t.id < 1000000000000 ? t.id : 0,
        isMandatory: t.isMandatory !== undefined ? Boolean(t.isMandatory) : true,
        proposalId: Number(idToUse),
        sequence: Number(t.sequence || idx + 1),
        termDescription: String(t.termDescription || t.details || t.description || ''),
        termMasterId: Number(t.termMasterId || 0),
        termTitle: String(t.termTitle || t.term || t.title || ''),
        userId: currentUserId,
      }));

      const res = await saveTermsBatch(idToUse, payload);
      const resData = res?.data?.data ?? res?.data;
      if (Array.isArray(resData) && resData.length > 0) {
        setTerms(
          resData.map((item, idx) => ({
            id: item.id || idx + 1,
            termTitle: item.termTitle || item.term || item.title || '',
            termDescription: item.termDescription || item.details || item.description || '',
            term: item.termTitle || item.term || item.title || '',
            details: item.termDescription || item.details || item.description || '',
            isMandatory: item.isMandatory !== undefined ? Boolean(item.isMandatory) : true,
            sequence: item.sequence || idx + 1,
            termMasterId: item.termMasterId || 0,
            proposalId: Number(idToUse),
            userId: item.userId || currentUserId,
          }))
        );
      }
    } catch (err) {
      console.warn('Backend terms batch save response:', err);
    }
  };

  // Handler for Save as Draft at any step
  const handleSaveDraft = async () => {
    setSavingStep(true);
    try {
      if (currentStep === 5) {
        const idToUse = proposalId || (await persistBasicDetails(true));
        await persistShifts(idToUse);
        await persistBasicDetails(true);
      } else {
        const savedId = await persistBasicDetails(true);
        if (currentStep === 2) {
          await persistAssets(savedId);
        } else if (currentStep === 3) {
          await persistManpower(savedId);
        } else if (currentStep === 4) {
          await persistOtherCosts(savedId);
        } else if (currentStep === 6) {
          await persistTerms(savedId);
        }
      }
      toast.success(
        isSentForApproval ? 'Proposal saved successfully.' : 'Proposal saved as draft.'
      );
      navigate(isApprovalMode ? '/proposal/approval' : '/proposal');
    } catch (err) {
      console.error('Save failed:', err);
      // When validation fails, do not show 'saved locally' or navigate away
      if (!err?.message || err.message.includes('saved')) {
        toast.error('Failed to save proposal draft.');
      }
    } finally {
      setSavingStep(false);
    }
  };

  // Handler for Save & Continue at each step
  const handleSaveContinue = async () => {
    setSavingStep(true);
    try {
      if (currentStep === 1) {
        const generatedId = await persistBasicDetails(false);
        toast.success('Basic details saved.');
      } else if (currentStep === 2) {
        const idToUse = proposalId || (await persistBasicDetails(false));
        await persistAssets(idToUse);
        toast.success('Assets configuration saved.');
      } else if (currentStep === 3) {
        const idToUse = proposalId || (await persistBasicDetails(false));
        await persistManpower(idToUse);
        toast.success('Manpower configuration saved.');
      } else if (currentStep === 4) {
        const idToUse = proposalId || (await persistBasicDetails(false));
        await persistOtherCosts(idToUse);
        toast.success('Overhead expense allocation saved.');
      } else if (currentStep === 5) {
        if (Number(shiftService.supplyDaysPerMonth) > 31) {
          toast.error('Supply Days per Month cannot exceed 31.');
          setSavingStep(false);
          return;
        }
        await persistShifts(proposalId);
        await persistBasicDetails(true);
        toast.success('Shift & service configuration saved.');
      }

      // Advance to next step
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxCompletedStep((prev) => Math.max(prev, nextStep));
    } catch (err) {
      console.error('Step save error:', err);
      // Stop and do not advance if step 1 validation fails or err occurred
      if (currentStep === 1 || err?.message) {
        return;
      }
      toast.error('Failed to save step progress.');
    } finally {
      setSavingStep(false);
    }
  };

  // Helper to update supply days and persist changes
  const handleUpdateSupplyDays = useCallback(
    async (days) => {
      const parsed = days === '' ? '' : Number(days);
      setShiftService((prev) => ({ ...prev, supplyDaysPerMonth: parsed }));
      setBasicDetails((prev) => ({ ...prev, supplyDaysPerMonth: parsed }));
      if (proposalId && parsed > 0 && parsed <= 31) {
        try {
          await persistBasicDetails(true, { supplyDaysPerMonth: parsed });
        } catch (e) {
          console.warn('Persist basic details on supply days change error:', e);
        }
      }
    },
    [proposalId, persistBasicDetails]
  );

  const handleSaveProposalOverride = useCallback(
    async (overrides) => {
      return await persistBasicDetails(true, overrides);
    },
    [proposalId, shiftService, basicDetails, terms, specialNotes, currentStep]
  );

  // Handler to navigate to next step without calling any API
  const handleNextStep = () => {
    const nextStep = Math.min(currentStep + 1, 6);
    setCurrentStep(nextStep);
    setMaxCompletedStep((prev) => Math.max(prev, nextStep));
  };

  // Handler for Step 6: Send for Approval (when status is DRAFT)
  const handleSubmitForApproval = async () => {
    setSubmittingApproval(true);
    try {
      const finalId =
        proposalId ||
        (await persistBasicDetails(false, { status: PROPOSAL_STATUS.PENDING_APPROVAL }));
      await persistAssets(finalId);
      await persistManpower(finalId);
      await persistOtherCosts(finalId);
      await persistShifts(finalId);
      await persistTerms(finalId);

      try {
        if (finalId) {
          await submitProposalForApproval(finalId);
        }
      } catch (err) {
        console.warn('Backend submit approval fallback to status update:', err);
        try {
          if (finalId) {
            await updateProposalStatus(finalId, PROPOSAL_STATUS.PENDING_APPROVAL);
          }
        } catch (innerErr) {
          console.warn('Status update fallback:', innerErr);
        }
      }

      toast.success('Proposal submitted for approval successfully!', {
        duration: 4000,
      });
      navigate('/proposal');
    } catch (err) {
      console.error('Submit for approval failed:', err);
      toast.error(err?.message || 'Failed to submit proposal for approval.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Handler for Step 6: Update Proposal (when status is PENDING_APPROVAL)
  const handleUpdateProposal = async () => {
    setUpdatingProposal(true);
    try {
      const finalId = proposalId || (await persistBasicDetails(false));
      await persistAssets(finalId);
      await persistManpower(finalId);
      await persistShifts(finalId);
      await persistTerms(finalId);

      toast.success('Proposal updated successfully!', {
        duration: 4000,
      });
      navigate(isApprovalMode ? '/proposal/approval' : '/proposal');
    } catch (err) {
      console.error('Update proposal failed:', err);
      toast.error('Failed to update proposal. Please try again.');
    } finally {
      setUpdatingProposal(false);
    }
  };

  // Handler for Step 6: Update & Approve Proposal (when status is PENDING_APPROVAL and user has rights)
  const handleUpdateAndApproveProposal = async () => {
    setApprovingProposal(true);
    try {
      const finalId =
        proposalId || (await persistBasicDetails(false, { status: 'APPROVED' }));
      await persistAssets(finalId);
      await persistManpower(finalId);
      await persistShifts(finalId);
      await persistTerms(finalId);

      try {
        if (finalId) {
          await approveProposal(finalId);
        }
      } catch (err) {
        console.warn('Backend approve fallback:', err);
        try {
          if (finalId) {
            await updateProposalStatus(finalId, 'APPROVED');
          }
        } catch (innerErr) {
          console.warn('Status update fallback to APPROVED:', innerErr);
        }
      }

      toast.success('Proposal updated and approved successfully!', {
        duration: 4000,
      });
      navigate(isApprovalMode ? '/proposal/approval' : '/proposal');
    } catch (err) {
      console.error('Update and approve proposal failed:', err);
      toast.error('Failed to approve proposal. Please try again.');
    } finally {
      setApprovingProposal(false);
    }
  };

  if (canView === false || (!isEditMode && canAdd === false) || (isEditMode && canEdit === false && canView === false)) {
    return <AccessDenied pageTitle="Proposal" />;
  }

  if (pageLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-[#084E92]" />
          Loading proposal details...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="pt-2 pb-10 mx-auto space-y-4">
        {/* Standard Page Header */}
        <PageHeader
          title={isEditMode ? `Edit Proposal` : 'Create New Proposal'}
          description={currentStepMeta.description}
        />

        {/* 5-Step Progress Tracker */}
        <ProposalStepper
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          maxCompletedStep={maxCompletedStep}
        />

        {/* Step Content */}
        <div className="mt-5">
          {currentStep === 1 && (
            <StepBasicDetails
              data={basicDetails}
              onChange={(fields) => setBasicDetails((prev) => ({ ...prev, ...fields }))}
              onSaveDraft={handleSaveDraft}
              onSaveContinue={handleSaveContinue}
              onNext={handleNextStep}
              onCancel={() => navigate('/proposal')}
              saving={savingStep}
              isSentForApproval={isSentForApproval}
            />
          )}

          {currentStep === 2 && (
            <StepAssets
              data={assets}
              proposalId={proposalId}
              basicDetails={basicDetails}
              clientPercentage={costSharePercentages.assets}
              onClientPercentageChange={(val) => handleUpdateCostSharePercentage('assets', val)}
              onChange={setAssets}
              onSaveDraft={handleSaveDraft}
              onSaveContinue={handleSaveContinue}
              onNext={handleNextStep}
              onPrevious={() => setCurrentStep(1)}
              saving={savingStep}
              isSentForApproval={isSentForApproval}
            />
          )}

          {currentStep === 3 && (
            <StepManpower
              data={manpower}
              proposalId={proposalId}
              basicDetails={basicDetails}
              clientPercentage={costSharePercentages.manpower}
              onClientPercentageChange={(val) => handleUpdateCostSharePercentage('manpower', val)}
              onChange={(fields) => setManpower((prev) => ({ ...prev, ...fields }))}
              onSaveDraft={handleSaveDraft}
              onSaveContinue={handleSaveContinue}
              onNext={handleNextStep}
              onPrevious={() => setCurrentStep(2)}
              saving={savingStep}
              isSentForApproval={isSentForApproval}
            />
          )}

          {currentStep === 4 && (
            <StepOtherCost
              data={otherCosts}
              basicDetails={basicDetails}
              proposalId={proposalId}
              clientPercentage={costSharePercentages.overhead}
              onClientPercentageChange={(val) => handleUpdateCostSharePercentage('overhead', val)}
              onChange={setOtherCosts}
              onSaveDraft={handleSaveDraft}
              onSaveContinue={handleSaveContinue}
              onNext={handleNextStep}
              onPrevious={() => setCurrentStep(3)}
              saving={savingStep}
              isSentForApproval={isSentForApproval}
            />
          )}

          {currentStep === 5 && (
            <StepShiftService
              data={shiftService}
              proposalId={proposalId}
              basicDetails={basicDetails}
              manpowerData={manpower}
              otherCostsData={otherCosts}
              assetsData={assets}
              costSharePercentages={costSharePercentages}
              onChange={(fields) => setShiftService((prev) => ({ ...prev, ...fields }))}
              onUpdateSupplyDays={handleUpdateSupplyDays}
              onSaveProposal={handleSaveProposalOverride}
              onSaveDraft={handleSaveDraft}
              onSaveContinue={handleSaveContinue}
              onNext={handleNextStep}
              onPrevious={() => setCurrentStep(4)}
              saving={savingStep}
              isSentForApproval={isSentForApproval}
            />
          )}

          {currentStep === 6 && (
            <StepTermsConditions
              proposalId={proposalId}
              status={basicDetails.status}
              isPendingApproval={isSentForApproval}
              canApprove={canApprove}
              terms={terms}
              attachments={attachments}
              specialNotes={specialNotes}
              onUpdateTerms={setTerms}
              onUpdateAttachments={setAttachments}
              onUpdateSpecialNotes={setSpecialNotes}
              onSaveTerms={persistTerms}
              onSaveDraft={handleSaveDraft}
              onSubmitForApproval={handleSubmitForApproval}
              onUpdateProposal={handleUpdateProposal}
              onUpdateAndApprove={handleUpdateAndApproveProposal}
              onPrevious={() => setCurrentStep(5)}
              saving={savingStep}
              submitting={submittingApproval}
              updating={updatingProposal}
              approving={approvingProposal}
            />
          )}
        </div>
      </div>
    </Container>
  );
};

export default CreateProposal;
