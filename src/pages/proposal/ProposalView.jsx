import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Printer,
  Pencil,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  UtensilsCrossed,
  DollarSign,
  Users,
  Boxes,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  RefreshCw,
  Loader2,
  TrendingUp,
  Percent,
  Receipt,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';

import { Container } from '@/components/common/container';
import { PageHeader } from '@/components/common/PageHeader';
import { AccessDenied } from '@/components/common/AccessDenied';
import { usePagePermissions } from '@/utils/permissions';
import {
  getCompleteProposalById,
  getProposalById,
  getAssetsByProposalId,
  getManpowerByProposalId,
  getOtherCostsByProposalId,
  getTermsByProposalId,
  getProposalFoodCostSummary,
} from '@/services/apiServices';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
  formatText,
  getStatusBadge,
} from '@/utils/proposalFormatters';

/**
 * Safely unpack an array from various API response shapes
 */
const extractArray = (res) => {
  const d = res?.data?.data ?? res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export const ProposalView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { canView, canEdit } = usePagePermissions([
    'Proposal',
    'Proposals',
    'Proposal Management',
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Proposal State
  const [proposalData, setProposalData] = useState(null);
  const [rawProposal, setRawProposal] = useState(null);
  const [manpowerList, setManpowerList] = useState([]);
  const [assetList, setAssetList] = useState([]);
  const [otherCostList, setOtherCostList] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [foodCostSummary, setFoodCostSummary] = useState(null);
  const [slotsByShiftId, setSlotsByShiftId] = useState({});

  // Section collapse state: all sections open by default
  const [openSections, setOpenSections] = useState({
    basicDetails: true,
    financialSummary: true,
    manpower: true,
    assets: true,
    otherCosts: true,
    shiftDetails: true,
    slotRecipes: true,
    terms: true,
    audit: true,
  });

  const toggleSection = useCallback((sectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  const allSectionsOpen = useMemo(() => {
    return Object.values(openSections).every(Boolean);
  }, [openSections]);

  const toggleAllSections = useCallback(() => {
    const nextState = !allSectionsOpen;
    setOpenSections({
      basicDetails: nextState,
      financialSummary: nextState,
      manpower: nextState,
      assets: nextState,
      otherCosts: nextState,
      shiftDetails: nextState,
      slotRecipes: nextState,
      terms: nextState,
      audit: nextState,
    });
  }, [allSectionsOpen]);

  // Check if arrival is from approval list
  const isApprovalMode = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('mode') === 'approval' || location.state?.fromApproval;
  }, [location.search, location.state]);

  const loadProposalDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    let isCancelled = false;

    try {
      // 1. Fetch complete proposal in a single API call
      let resData = null;
      try {
        const completeRes = await getCompleteProposalById(id);
        resData = completeRes?.data?.data ?? completeRes?.data;
      } catch (completeErr) {
        console.warn('getCompleteProposalById error, falling back:', completeErr);
      }

      // If complete endpoint succeeded and returned data, use it directly (NO extra API calls!)
      if (resData && (resData.proposal || resData.shifts || resData.commercialSummary)) {
        if (isCancelled) return;

        const p = resData.proposal || resData;
        setRawProposal(resData);
        setProposalData(p);

        // Assets
        const assets =
          (Array.isArray(resData?.commercialSummary?.assets) && resData.commercialSummary.assets) ||
          (Array.isArray(resData?.assets) && resData.assets) ||
          (Array.isArray(p?.assets) && p.assets) ||
          [];
        setAssetList(assets);

        // Manpower
        const manpower =
          (Array.isArray(resData?.commercialSummary?.manpower) && resData.commercialSummary.manpower) ||
          (Array.isArray(resData?.manpower) && resData.manpower) ||
          (Array.isArray(resData?.manpowerList) && resData.manpowerList) ||
          (Array.isArray(p?.manpower) && p.manpower) ||
          [];
        setManpowerList(manpower);

        // Other Costs
        const otherCosts =
          (Array.isArray(resData?.commercialSummary?.otherCosts) && resData.commercialSummary.otherCosts) ||
          (Array.isArray(resData?.otherCosts) && resData.otherCosts) ||
          (Array.isArray(p?.otherCosts) && p.otherCosts) ||
          [];
        setOtherCostList(otherCosts);

        // Terms
        const terms =
          (Array.isArray(resData?.terms) && resData.terms) ||
          (Array.isArray(p?.terms) && p.terms) ||
          (Array.isArray(resData?.termsAndConditions) && resData.termsAndConditions) ||
          [];
        setTermsList(terms);

        // Food Cost Summary
        const fc = resData.foodCostSummary || resData.commercialSummary || p.foodCostSummary || null;
        setFoodCostSummary(fc);

        // Shift Menu Slots extracted directly from complete response
        const slotMap = {};
        const allShifts = Array.isArray(resData?.shifts) && resData.shifts.length > 0
          ? resData.shifts
          : (Array.isArray(p?.shifts) ? p.shifts : []);
        allShifts.forEach((s) => {
          const shiftObj = s.shift || s;
          const shiftId = shiftObj.id || shiftObj.shiftId;
          const slots = s.menuSlots || shiftObj.menuSlots || s.slots || shiftObj.slots;
          if (shiftId && Array.isArray(slots)) {
            slotMap[shiftId] = slots;
          }
        });
        setSlotsByShiftId(slotMap);
      } else {
        // Fallback: fetch proposal by ID and individual line items only if complete endpoint failed
        const res = await getProposalById(id);
        if (isCancelled) return;

        const fallbackData = res?.data?.data ?? res?.data;
        if (!fallbackData) {
          throw new Error('No proposal data returned from server');
        }

        const p = fallbackData.proposal || fallbackData;
        setRawProposal(fallbackData);
        setProposalData(p);

        const [assetRes, mpRes, ocRes, termsRes, foodCostRes] = await Promise.allSettled([
          getAssetsByProposalId(id),
          getManpowerByProposalId(id),
          getOtherCostsByProposalId(id),
          getTermsByProposalId(id),
          getProposalFoodCostSummary(id),
        ]);

        if (isCancelled) return;
        if (assetRes.status === 'fulfilled') setAssetList(extractArray(assetRes.value));
        if (mpRes.status === 'fulfilled') setManpowerList(extractArray(mpRes.value));
        if (ocRes.status === 'fulfilled') setOtherCostList(extractArray(ocRes.value));
        if (termsRes.status === 'fulfilled') setTermsList(extractArray(termsRes.value));
        if (foodCostRes.status === 'fulfilled') {
          const fc = foodCostRes.value?.data?.data ?? foodCostRes.value?.data;
          if (fc) setFoodCostSummary(fc);
        }
      }
    } catch (err) {
      console.error('Failed to load proposal details:', err);
      if (!isCancelled) {
        setError(err.message || 'Failed to load proposal details.');
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  useEffect(() => {
    loadProposalDetails();
  }, [loadProposalDetails]);

  // Handle Edit Action
  const handleEdit = useCallback(() => {
    const editUrl = `/proposals/${id}/edit${isApprovalMode ? '?mode=approval' : ''}`;
    navigate(editUrl);
  }, [id, isApprovalMode, navigate]);

  // Handle Print Action
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Computed Shifts sorted by sequence, filtering active ones
  const activeShifts = useMemo(() => {
    let rawShifts = [];
    if (Array.isArray(rawProposal?.shifts) && rawProposal.shifts.length > 0) {
      rawShifts = rawProposal.shifts.map((s) => {
        const shiftObj = s.shift || s;
        return {
          ...shiftObj,
          ...(s.costSummary || {}),
          menuSlots: s.menuSlots || shiftObj.menuSlots || [],
        };
      });
    } else if (Array.isArray(proposalData?.shifts) && proposalData.shifts.length > 0) {
      rawShifts = proposalData.shifts;
    }

    return rawShifts
      .filter((s) => s?.isActive !== false)
      .sort((a, b) => Number(a?.sequence ?? 0) - Number(b?.sequence ?? 0));
  }, [proposalData?.shifts, rawProposal?.shifts]);

  // Shift Totals calculation across all active shifts
  const shiftTotals = useMemo(() => {
    let totalHeadcount = 0;
    let totalGuaranteedPax = 0;
    let totalRm = 0;
    let totalMp = 0;
    let totalOv = 0;
    let totalAst = 0;
    let totalFuel = 0;
    let totalShiftCost = 0;
    let totalProposed = 0;
    let totalQuoted = 0;
    let totalContracted = 0;

    activeShifts.forEach((shift) => {
      const shiftId = shift.id || shift.shiftId;
      const matchedSummary = (foodCostSummary?.shifts || []).find((s) => {
        const sId = s.shiftId ?? s.id;
        const targetId = shift.id ?? shift.shiftId;
        if (sId && targetId && Number(sId) === Number(targetId)) return true;
        if (s.shiftName && shift.shiftName && s.shiftName.trim().toLowerCase() === shift.shiftName.trim().toLowerCase()) return true;
        return false;
      });

      totalHeadcount += Number(shift.headCount ?? shift.headcount ?? 0);
      totalGuaranteedPax += Number(shift.guaranteedPax ?? 0);
      totalRm += Number(shift.rawMaterialCost ?? shift.rmCost ?? shift.ratePerPlate ?? matchedSummary?.rawMaterialCostPerPlate ?? 0);
      totalMp += Number(shift.manpowerCost ?? matchedSummary?.manpowerCostPerPlate ?? 0);
      totalOv += Number(shift.overheadCost ?? matchedSummary?.overheadCostPerPlate ?? 0);
      totalAst += Number(shift.assetCost ?? shift.dailyAssetCost ?? matchedSummary?.assetCostPerPlate ?? 0);
      totalFuel += Number(shift.fuelCost ?? 0);
      totalShiftCost += Number(shift.totalShiftCost ?? shift.totalCost ?? 0);
      totalProposed += Number(shift.proposedRate ?? 0);
      totalQuoted += Number(shift.quotedRate ?? 0);
      totalContracted += Number(shift.contractedRate ?? shift.quotedRate ?? shift.proposedRate ?? 0);
    });

    return {
      totalHeadcount,
      totalGuaranteedPax,
      totalRm,
      totalMp,
      totalOv,
      totalAst,
      totalFuel,
      totalShiftCost,
      totalProposed,
      totalQuoted,
      totalContracted,
    };
  }, [activeShifts, foodCostSummary]);

  // Computed Terms sorted by sequence
  const sortedTerms = useMemo(() => {
    return (termsList || [])
      .slice()
      .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));
  }, [termsList]);

  // Permission check
  if (canView === false) {
    return <AccessDenied pageTitle="Proposal" />;
  }

  // Loading State
  if (loading) {
    return (
      <Container width="fluid" className="w-full max-w-full overflow-x-hidden py-6 px-3 sm:px-6">
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-[#084E92]" />
          <p className="text-sm font-semibold">Loading proposal details...</p>
        </div>
      </Container>
    );
  }

  // Error State
  if (error || !proposalData) {
    return (
      <Container width="fluid" className="w-full max-w-full overflow-x-hidden py-6 px-3 sm:px-6">
        <div className="py-16 max-w-lg mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Failed to Load Proposal</h2>
          <p className="text-xs text-gray-500">{error || 'Proposal could not be found or loaded.'}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/proposal')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Proposals
            </button>
            <button
              type="button"
              onClick={loadProposalDetails}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#084E92] text-white hover:bg-[#073e77] transition inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </Container>
    );
  }

  const p = proposalData;
  const statusBadge = getStatusBadge(p.status);
  const isApproved = String(p.status || '').toUpperCase().trim() === 'APPROVED';

  // Financial values extraction
  const totalFoodCost = p.totalFoodCost ?? rawProposal?.commercialSummary?.totalFoodCost ?? rawProposal?.totalFoodCost;
  const totalManpowerCost = p.totalManpowerCost ?? rawProposal?.commercialSummary?.totalManpowerCost ?? rawProposal?.totalManpowerCost;
  const manpowerDiscountPercentage = p.manpowerDiscountPercentage ?? p.manpowerClientPercentage ?? rawProposal?.manpowerDiscountPercentage ?? rawProposal?.manpowerClientPercentage ?? rawProposal?.commercialSummary?.manpowerDiscountPercentage;
  const totalOtherCost = p.totalOtherCost ?? rawProposal?.commercialSummary?.totalOtherCost ?? rawProposal?.totalOtherCost;
  const otherCostDiscountPercentage = p.otherCostDiscountPercentage ?? p.overheadClientPercentage ?? rawProposal?.otherCostDiscountPercentage ?? rawProposal?.overheadClientPercentage ?? rawProposal?.commercialSummary?.otherCostDiscountPercentage;
  const totalAssetCost = p.totalAssetCost ?? rawProposal?.commercialSummary?.totalAssetCost ?? rawProposal?.totalAssetCost;
  const assetDiscountPercentage = p.assetDiscountPercentage ?? p.assetClientPercentage ?? rawProposal?.assetDiscountPercentage ?? rawProposal?.assetClientPercentage ?? rawProposal?.commercialSummary?.assetDiscountPercentage;
  const totalCost = p.totalCost ?? rawProposal?.commercialSummary?.totalCost ?? rawProposal?.totalCost;
  const totalValue = p.totalValue ?? rawProposal?.commercialSummary?.totalValue ?? rawProposal?.totalValue;
  const marginValue = p.marginValue != null ? p.marginValue : totalValue != null && totalCost != null ? Number(totalValue) - Number(totalCost) : null;
  const marginPercentage = p.marginPercentage ?? p.margin ?? rawProposal?.commercialSummary?.marginPercentage;

  // Client share percentages
  const manpowerClientPercentage = p.manpowerClientPercentage ?? rawProposal?.manpowerClientPercentage;
  const assetClientPercentage = p.assetClientPercentage ?? rawProposal?.assetClientPercentage;
  const overheadClientPercentage = p.overheadClientPercentage ?? rawProposal?.overheadClientPercentage;

  // Manpower totals calculation
  const grossManpowerCost = manpowerList.reduce((acc, r) => {
    const hc = Number(r.headcount ?? r.headCount ?? 1);
    const salary = Number(r.basicSalary ?? r.monthlySalary ?? 0);
    return acc + (Number(r.totalCost) || hc * salary);
  }, 0);

  // Asset totals calculation
  const grossAssetCost = assetList.reduce((acc, r) => {
    const qty = Number(r.quantity ?? 1);
    const pr = Number(r.price ?? 0);
    return acc + (Number(r.totalCost) || qty * pr);
  }, 0);

  // Other Cost totals calculation (only service provider costs)
  const grossOtherCost = otherCostList.reduce((acc, r) => {
    if (r.responsibility === 'CLIENT') return acc;
    const qty = Number(r.quantity ?? 1);
    const pr = Number(r.price ?? 0);
    return acc + (Number(r.totalCost) || qty * pr);
  }, 0);

  return (
    <Container width="fluid" className="w-full max-w-full min-w-0 overflow-x-hidden py-4 space-y-4 px-3 sm:px-6">
      {/* Print & Scroll Stylesheet */}
      <style>{`
        .proposal-table-scroll {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(8, 78, 146, 0.3) transparent;
        }
        .proposal-table-scroll::-webkit-scrollbar {
          height: 6px !important;
          display: block !important;
        }
        .proposal-table-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .proposal-table-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
        .proposal-table-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }

        @media print {
          @page {
            margin: 10mm;
            size: A4 portrait;
          }
          body {
            background: white !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, [data-sidebar], .sidebar, .mega-menu, .no-print, button {
            display: none !important;
          }
          .proposal-section-content {
            display: block !important;
          }
          .print-full-width {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .proposal-section-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #d1d5db !important;
            box-shadow: none !important;
            margin-bottom: 14px !important;
          }
          table {
            break-inside: auto !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Action Navigation Header (Standard PageHeader) */}
      <div className="no-print w-full min-w-0">
        <PageHeader
          title="Proposal Overview"
          description={`Read-only commercial breakdown and operational specifications for ${p.proposalNumber || `Proposal #${p.id}`}`}
          onBack={() => navigate(-1)}
          badge={
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.badgeClass}`}>
              {statusBadge.label}
            </span>
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={toggleAllSections}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                title={allSectionsOpen ? 'Collapse All Sections' : 'Expand All Sections'}
              >
                <ChevronsUpDown size={14} />
                <span>{allSectionsOpen ? 'Collapse All' : 'Expand All'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                title="Print Proposal"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>

              {canEdit && !isApproved && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#084E92] text-white text-xs font-semibold hover:bg-[#073e77] transition shadow-xs cursor-pointer"
                  title="Edit Proposal"
                >
                  <Pencil size={14} />
                  <span>Edit Proposal</span>
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* 1. Header Card */}
      <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-5 shadow-2xs w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#084E92] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                {p.proposalNumber || `PRP-${String(p.id).padStart(4, '0')}`}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.badgeClass}`}>
                {statusBadge.label}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 pt-0.5 truncate" title={p.title}>
              {formatText(p.title, 'Commercial Catering Proposal')}
            </h2>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 border-t sm:border-t-0 sm:border-l border-gray-100 pt-2.5 sm:pt-0 sm:pl-6 text-xs text-gray-600 shrink-0">
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Proposal Date</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatDate(p.proposalDate)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validity Date</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatDate(p.validityDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Basic Details Card */}
      <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('basicDetails')}
          className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#084E92]" />
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
              Basic Details
            </h3>
          </div>
          <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
            {openSections.basicDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <div className={`proposal-section-content ${openSections.basicDetails ? 'block' : 'hidden'} w-full max-w-full min-w-0`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-xs w-full min-w-0">
            {/* Left Column */}
            <div className="space-y-2 w-full min-w-0">
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Client Name:</span>
                <span className="font-semibold text-gray-900 text-right truncate" title={p.clientName}>{formatText(p.clientName)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Contact Person:</span>
                <span className="font-semibold text-gray-900 text-right truncate" title={p.clientContactPerson}>{formatText(p.clientContactPerson)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Client Email:</span>
                <span className="font-semibold text-gray-900 text-right truncate" title={p.clientEmail}>{formatText(p.clientEmail)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Client Phone:</span>
                <span className="font-semibold text-gray-900 text-right truncate">{formatText(p.clientPhone)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">State:</span>
                <span className="font-semibold text-gray-900 text-right truncate">{formatText(p.stateName)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Organization / Unit:</span>
                <span className="font-semibold text-gray-900 text-right truncate" title={p.organizationName}>
                  {p.organizationName
                    ? `${p.organizationName}${p.organizationCode ? ` (${p.organizationCode})` : ''}`
                    : '—'}
                </span>
              </div>
              {p.subOutletName && (
                <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0">Sub-Outlet:</span>
                  <span className="font-semibold text-gray-900 text-right truncate">
                    {p.subOutletName}{p.subOutletCode ? ` (${p.subOutletCode})` : ''}
                  </span>
                </div>
              )}
              {p.defaultMaterialCenterName && (
                <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0">Default Material Center:</span>
                  <span className="font-semibold text-gray-900 text-right truncate">{p.defaultMaterialCenterName}</span>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-2 w-full min-w-0">
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Proposal Type:</span>
                <span className="font-semibold text-gray-900 text-right truncate">{formatText(p.proposalTypeName || p.proposalType)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Service Duration:</span>
                <span className="font-semibold text-gray-900 text-right truncate">
                  {p.serviceStartDate ? `${formatDate(p.serviceStartDate)} to ${formatDate(p.serviceEndDate)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Supply Days Per Month:</span>
                <span className="font-semibold text-gray-900 text-right truncate">{formatText(p.supplyDaysPerMonth, '30')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Supply Days Per Year:</span>
                <span className="font-semibold text-gray-900 text-right truncate">
                  {p.supplyDaysPerYear ?? (p.supplyDaysPerMonth ? Number(p.supplyDaysPerMonth) * 12 : '360')}
                </span>
              </div>
              {p.remarks && (
                <div className="flex items-start justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0">Remarks:</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs break-words">{p.remarks}</span>
                </div>
              )}
              {p.specialNotes && (
                <div className="flex items-start justify-between py-1 border-b border-gray-50 gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0">Special Notes:</span>
                  <span className="font-medium text-gray-800 text-right max-w-xs break-words">{p.specialNotes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Financial Summary */}
      <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('financialSummary')}
          className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group flex-wrap gap-2"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-[#084E92]" />
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
              Financial Summary
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {(manpowerClientPercentage > 0 || assetClientPercentage > 0 || overheadClientPercentage > 0) && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium flex-wrap">
                <span>Client Shares:</span>
                {manpowerClientPercentage > 0 && (
                  <span className="bg-blue-50 text-[#084E92] px-2 py-0.5 rounded-full border border-blue-100">
                    Manpower: {formatPercent(manpowerClientPercentage)}
                  </span>
                )}
                {assetClientPercentage > 0 && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                    Assets: {formatPercent(assetClientPercentage)}
                  </span>
                )}
                {overheadClientPercentage > 0 && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                    Overhead: {formatPercent(overheadClientPercentage)}
                  </span>
                )}
              </div>
            )}
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.financialSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </button>

        <div className={`proposal-section-content ${openSections.financialSummary ? 'block' : 'hidden'} w-full max-w-full min-w-0`}>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate" title="Total Food Cost">Total Food Cost</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 block truncate">{formatCurrency(totalFoodCost)}</span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate" title="Total Manpower Cost">Total Manpower Cost</span>
                {Number(manpowerDiscountPercentage) > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded shrink-0">
                    -{formatPercent(manpowerDiscountPercentage)}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 block truncate">{formatCurrency(totalManpowerCost)}</span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate" title="Total Other / Overhead">Total Overhead</span>
                {Number(otherCostDiscountPercentage) > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded shrink-0">
                    -{formatPercent(otherCostDiscountPercentage)}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 block truncate">{formatCurrency(totalOtherCost)}</span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate" title="Total Asset Cost">Total Asset Cost</span>
                {Number(assetDiscountPercentage) > 0 && (
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded shrink-0">
                    -{formatPercent(assetDiscountPercentage)}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 block truncate">{formatCurrency(totalAssetCost)}</span>
            </div>

            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-[#084E92] uppercase tracking-wider block truncate">Total Cost</span>
              <span className="text-sm sm:text-base font-bold text-[#084E92] mt-0.5 block truncate">{formatCurrency(totalCost)}</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block truncate">Total Value (Quote)</span>
              <span className="text-sm sm:text-base font-bold text-emerald-800 mt-0.5 block truncate">{formatCurrency(totalValue)}</span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">Margin Value</span>
              <span className={`text-sm sm:text-base font-bold mt-0.5 block truncate ${Number(marginValue) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(marginValue)}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider block truncate">Margin Percentage</span>
              <span className={`text-sm sm:text-base font-bold mt-0.5 block truncate ${Number(marginPercentage) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatPercent(marginPercentage)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Manpower Details */}
      {manpowerList.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('manpower')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Manpower Details ({manpowerList.length})
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.manpower ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.manpower ? 'block' : 'hidden'} space-y-3 w-full max-w-full min-w-0`}>
            <div className="w-full max-w-full min-w-0 overflow-x-auto proposal-table-scroll rounded-xl border border-gray-100" style={{ maxWidth: '100%' }}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Headcount</th>
                    <th className="py-2.5 px-3 text-right">Basic Monthly Salary</th>
                    <th className="py-2.5 px-3 text-right">Daily Salary</th>
                    <th className="py-2.5 px-3 text-right">Overtime Allowance</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {manpowerList.map((mp, idx) => (
                    <tr key={mp.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-center text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {mp.manpowerName || mp.roleName || mp.role?.name || mp.role || `Role ${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-800 font-medium">{mp.headCount ?? mp.headcount ?? 1}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(mp.monthlySalary ?? mp.basicSalary)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(mp.dailyWageRate ?? mp.dailySalary)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(mp.overtimeAllowance, '₹0.00')}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                        {formatCurrency(mp.totalMonthlyCost ?? mp.totalCost ?? (Number(mp.headCount ?? 1) * Number(mp.monthlySalary ?? 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-6 pt-1 text-xs text-gray-600">
              <span>
                Gross Total: <strong className="text-gray-900 font-bold">{formatCurrency(grossManpowerCost)}</strong>
              </span>
              {Number(manpowerDiscountPercentage) > 0 && (
                <span>
                  Discount / Client Share: <strong className="text-emerald-600 font-bold">{formatPercent(manpowerDiscountPercentage)}</strong>
                </span>
              )}
              <span>
                Net Manpower Cost: <strong className="text-[#084E92] font-bold">{formatCurrency(totalManpowerCost ?? grossManpowerCost)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Asset Details */}
      {assetList.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('assets')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Boxes size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Asset Details ({assetList.length})
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.assets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.assets ? 'block' : 'hidden'} space-y-3 w-full max-w-full min-w-0`}>
            <div className="w-full max-w-full min-w-0 overflow-x-auto proposal-table-scroll rounded-xl border border-gray-100" style={{ maxWidth: '100%' }}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assetList.map((ast, idx) => (
                    <tr key={ast.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-center text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">{formatText(ast.assetCode, '—')}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{ast.assetName || ast.name || `Asset ${idx + 1}`}</td>
                      <td className="py-2.5 px-3 text-gray-600">{formatText(ast.categoryName || ast.category)}</td>
                      <td className="py-2.5 px-3 text-center text-gray-800 font-medium">{ast.quantity ?? 1}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(ast.price ?? ast.rate)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                        {formatCurrency(ast.totalCost ?? (Number(ast.quantity ?? 1) * Number(ast.price ?? 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-6 pt-1 text-xs text-gray-600">
              <span>
                Gross Total: <strong className="text-gray-900 font-bold">{formatCurrency(grossAssetCost)}</strong>
              </span>
              {Number(assetDiscountPercentage) > 0 && (
                <span>
                  Discount / Client Share: <strong className="text-emerald-600 font-bold">{formatPercent(assetDiscountPercentage)}</strong>
                </span>
              )}
              <span>
                Net Asset Cost: <strong className="text-[#084E92] font-bold">{formatCurrency(totalAssetCost ?? grossAssetCost)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Overhead / Other Costs */}
      {otherCostList.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('otherCosts')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Overhead & Other Costs ({otherCostList.length})
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.otherCosts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.otherCosts ? 'block' : 'hidden'} space-y-3 w-full max-w-full min-w-0`}>
            <div className="w-full max-w-full min-w-0 overflow-x-auto proposal-table-scroll rounded-xl border border-gray-100" style={{ maxWidth: '100%' }}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[750px]">
                <thead>
                  <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Cost Factor</th>
                    <th className="py-2.5 px-3">Calculation Basis</th>
                    <th className="py-2.5 px-3">Responsibility</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3">Validity Duration</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {otherCostList.map((oc, idx) => {
                    const isClient = oc.responsibility === 'CLIENT';
                    return (
                      <tr key={oc.id || idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-center text-gray-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {oc.costFactor || oc.costType || `Cost Line ${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">{formatText(oc.calculationBasis)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isClient
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-[#084E92] border-blue-100'
                              }`}
                          >
                            {isClient ? 'Client' : 'Service Provider'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-700 font-medium">
                          {isClient ? '—' : oc.quantity ?? 1}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-700">
                          {isClient ? '—' : formatCurrency(oc.price)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {isClient ? (
                            <span className="text-amber-600 font-semibold italic text-[11px]">Client-borne</span>
                          ) : (
                            formatCurrency(oc.totalCost ?? (Number(oc.quantity ?? 1) * Number(oc.price ?? 0)))
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                          {oc.fromDate ? `${formatDate(oc.fromDate)} to ${formatDate(oc.toDate)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{formatText(oc.remarks)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-6 pt-1 text-xs text-gray-600">
              <span>
                Gross Total: <strong className="text-gray-900 font-bold">{formatCurrency(grossOtherCost)}</strong>
              </span>
              {Number(otherCostDiscountPercentage) > 0 && (
                <span>
                  Discount / Client Share: <strong className="text-emerald-600 font-bold">{formatPercent(otherCostDiscountPercentage)}</strong>
                </span>
              )}
              <span>
                Net Overhead Cost: <strong className="text-[#084E92] font-bold">{formatCurrency(totalOtherCost ?? grossOtherCost)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Shift and Service Details */}
      {activeShifts.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('shiftDetails')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Shift & Service Details ({activeShifts.length})
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.shiftDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.shiftDetails ? 'block' : 'hidden'} space-y-4 w-full max-w-full min-w-0`}>
            {/* Comprehensive Shift Summary Table */}
            <div className="w-full max-w-full min-w-0 overflow-x-auto proposal-table-scroll rounded-xl border border-gray-100 bg-white" style={{ maxWidth: '100%' }}>
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Meal / Shift</th>
                    <th className="py-2.5 px-2 text-center">Headcount</th>
                    <th className="py-2.5 px-2 text-center">Guaranteed Pax</th>
                    <th className="py-2.5 px-3 text-right">R.M. Cost</th>
                    <th className="py-2.5 px-3 text-right">Manpower</th>
                    <th className="py-2.5 px-3 text-right">Overhead</th>
                    <th className="py-2.5 px-3 text-right">Asset</th>
                    <th className="py-2.5 px-3 text-right">Fuel Cost</th>
                    <th className="py-2.5 px-2 text-center">Inflation</th>
                    <th className="py-2.5 px-3 text-right font-bold text-gray-900">Total Shift Cost</th>
                    <th className="py-2.5 px-2 text-center text-emerald-600">Profit</th>
                    <th className="py-2.5 px-3 text-right">Proposed Rate</th>
                    <th className="py-2.5 px-3 text-right">Quoted Rate</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/30">Contracted Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeShifts.map((shift, idx) => {
                    const shiftId = shift.id || shift.shiftId;
                    const matchedSummary = (foodCostSummary?.shifts || []).find((s) => {
                      const sId = s.shiftId ?? s.id;
                      const targetId = shift.id ?? shift.shiftId;
                      if (sId && targetId && Number(sId) === Number(targetId)) return true;
                      if (s.shiftName && shift.shiftName && s.shiftName.trim().toLowerCase() === shift.shiftName.trim().toLowerCase()) return true;
                      return false;
                    });

                    const rm = shift.rawMaterialCost ?? shift.rmCost ?? shift.ratePerPlate ?? matchedSummary?.rawMaterialCostPerPlate;
                    const mp = shift.manpowerCost ?? matchedSummary?.manpowerCostPerPlate;
                    const ov = shift.overheadCost ?? matchedSummary?.overheadCostPerPlate;
                    const ast = shift.assetCost ?? shift.dailyAssetCost ?? matchedSummary?.assetCostPerPlate;
                    const contracted = shift.contractedRate ?? shift.quotedRate ?? shift.proposedRate;

                    return (
                      <tr key={shift.id || idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-900 block">{shift.shiftName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                            <span className="bg-blue-50 text-[#084E92] px-1.5 py-0.2 rounded font-semibold border border-blue-100">
                              {formatText(shift.mealTypeName || shift.mealType, 'Shift')}
                            </span>
                            {shift.mealStructureName && (
                              <span className="text-gray-400">• {shift.mealStructureName}</span>
                            )}
                            {(shift.startTime || shift.endTime) && (
                              <span className="text-gray-400">({shift.startTime || '—'} - {shift.endTime || '—'})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-800 font-semibold">{shift.headCount ?? shift.headcount ?? '—'}</td>
                        <td className="py-2.5 px-2 text-center text-gray-600">{shift.guaranteedPax ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(rm)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(mp)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(ov)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(ast)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(shift.fuelCost, '₹0.00')}</td>
                        <td className="py-2.5 px-2 text-center text-gray-600">{formatPercent(shift.inflationPercentage ?? shift.inflation)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">{formatCurrency(shift.totalShiftCost ?? shift.totalCost)}</td>
                        <td className="py-2.5 px-2 text-center text-emerald-600 font-semibold">{formatPercent(shift.profitPercentage ?? shift.profit)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(shift.proposedRate)}</td>
                        <td className="py-2.5 px-3 text-right text-[#084E92] font-semibold">{formatCurrency(shift.quotedRate)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatCurrency(contracted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/90 font-bold border-t border-gray-200 text-xs">
                    <td className="py-2.5 px-3 text-gray-900">Total / Summary</td>
                    <td className="py-2.5 px-2 text-center text-gray-900">{shiftTotals.totalHeadcount}</td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{shiftTotals.totalGuaranteedPax || '—'}</td>
                    <td className="py-2.5 px-3 text-right text-gray-900">{formatCurrency(shiftTotals.totalRm)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-900">{formatCurrency(shiftTotals.totalMp)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-900">{formatCurrency(shiftTotals.totalOv)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-900">{formatCurrency(shiftTotals.totalAst)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-900">{formatCurrency(shiftTotals.totalFuel)}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">—</td>
                    <td className="py-2.5 px-3 text-right text-[#084E92] font-extrabold">{formatCurrency(shiftTotals.totalShiftCost)}</td>
                    <td className="py-2.5 px-2 text-center text-gray-500">—</td>
                    <td className="py-2.5 px-3 text-right text-gray-800">{formatCurrency(shiftTotals.totalProposed)}</td>
                    <td className="py-2.5 px-3 text-right text-[#084E92] font-bold">{formatCurrency(shiftTotals.totalQuoted)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 font-extrabold bg-emerald-50/60">{formatCurrency(shiftTotals.totalContracted)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. Shift-wise Slot and Recipe Details */}
      {activeShifts.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('slotRecipes')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Shift-wise Slot & Recipe Details
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.slotRecipes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.slotRecipes ? 'block' : 'hidden'} space-y-4 w-full max-w-full min-w-0`}>
            {activeShifts.map((shift) => {
              const shiftId = shift.id || shift.shiftId;
              const shiftSlots =
                (Array.isArray(shift.menuSlots) && shift.menuSlots.length > 0 && shift.menuSlots) ||
                slotsByShiftId[shiftId] ||
                [];

              const matchedSummary = (foodCostSummary?.shifts || []).find((s) => {
                const sId = s.shiftId ?? s.id;
                const targetId = shift.id ?? shift.shiftId;
                if (sId && targetId && Number(sId) === Number(targetId)) return true;
                if (s.shiftName && shift.shiftName && s.shiftName.trim().toLowerCase() === shift.shiftName.trim().toLowerCase()) return true;
                return false;
              });

              // Unpack slot-wise recipe items
              let tableItems = [];
              if (shiftSlots.length > 0) {
                shiftSlots.forEach((slot, sIdx) => {
                  const subItems =
                    (Array.isArray(slot.items) && slot.items.length > 0 && slot.items) ||
                    (Array.isArray(slot.menuItems) && slot.menuItems.length > 0 && slot.menuItems) ||
                    [];

                  if (subItems.length > 0) {
                    subItems.forEach((it, iIdx) => {
                      const rmcVal = Number(it.monthlyRmcCost ?? it.rmcMonth ?? it.avgRmcPerDay ?? 0);
                      const lpgVal = Number(it.monthlyLpgCost ?? it.lpgCost ?? 0);
                      const totalVal = it.totalCost != null ? Number(it.totalCost) : Number((rmcVal + lpgVal).toFixed(2));
                      tableItems.push({
                        id: it.id || `${slot.id}_${iIdx}`,
                        slotName: slot.slotName || slot.mealSlotName || `Slot ${sIdx + 1}`,
                        categoryName: it.kitchenMenuCategoryName || slot.kitchenMenuCategoryName || slot.categoryName,
                        foodName: it.foodName || it.kitchenMenuItemName || it.itemName || it.recipeName || slot.slotName,
                        monthlyRmcCost: rmcVal,
                        monthlyLpgCost: lpgVal,
                        totalCost: totalVal,
                      });
                    });
                  } else {
                    const rmcVal = Number(slot.monthlyRmcCost ?? slot.rmcMonthCost ?? 0);
                    const lpgVal = Number(slot.monthlyLpgCost ?? slot.lpgCost ?? 0);
                    const totalVal = slot.totalCost != null ? Number(slot.totalCost) : Number((rmcVal + lpgVal).toFixed(2));
                    tableItems.push({
                      id: slot.id || `slot_${sIdx}`,
                      slotName: slot.slotName || slot.mealSlotName || `Slot ${sIdx + 1}`,
                      categoryName: slot.kitchenMenuCategoryName || slot.categoryName,
                      foodName: slot.foodName || slot.kitchenMenuItemName || slot.recipeName || slot.itemName || '—',
                      monthlyRmcCost: rmcVal,
                      monthlyLpgCost: lpgVal,
                      totalCost: totalVal,
                    });
                  }
                });
              } else {
                // Fallback to foodCostSummary or shift.slots
                const rawItems =
                  (Array.isArray(matchedSummary?.items) && matchedSummary.items) ||
                  (Array.isArray(matchedSummary?.slots) && matchedSummary.slots) ||
                  (Array.isArray(matchedSummary?.recipes) && matchedSummary.recipes) ||
                  (Array.isArray(matchedSummary?.menuItems) && matchedSummary.menuItems) ||
                  (Array.isArray(shift.slots) && shift.slots) ||
                  (Array.isArray(shift.items) && shift.items) ||
                  [];

                tableItems = rawItems.map((slot, sIdx) => {
                  const rmcVal = Number(slot.monthlyRmcCost ?? slot.rmcMonth ?? slot.avgRmcPerDay ?? 0);
                  const lpgVal = Number(slot.monthlyLpgCost ?? slot.lpgCost ?? 0);
                  const totalVal = slot.totalCost != null ? Number(slot.totalCost) : Number((rmcVal + lpgVal).toFixed(2));
                  return {
                    id: slot.id || sIdx,
                    slotName: slot.slotName || slot.mealSlotName || `Slot ${sIdx + 1}`,
                    categoryName: slot.kitchenMenuCategoryName || slot.categoryName,
                    foodName: slot.foodName || slot.kitchenMenuItemName || slot.recipeName || slot.itemName || 'Recipe Item',
                    monthlyRmcCost: rmcVal,
                    monthlyLpgCost: lpgVal,
                    totalCost: totalVal,
                  };
                });
              }

              const structName = shift.mealStructureName || shift.menuStructureName || 'Standard Menu Structure';
              const shiftRmcTotal = tableItems.reduce((acc, it) => acc + (Number(it.monthlyRmcCost) || 0), 0);
              const shiftLpgTotal = tableItems.reduce((acc, it) => acc + (Number(it.monthlyLpgCost) || 0), 0);
              const shiftCostTotal = tableItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);

              return (
                <div key={shift.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50/30 space-y-3 w-full min-w-0">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{shift.shiftName}</span>
                      <span className="text-[10px] text-gray-500 font-medium">({structName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#084E92] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {tableItems.length} Recipes / Slots
                      </span>
                    </div>
                  </div>

                  {tableItems.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      <p className="font-medium text-gray-500">{structName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Recipe details not loaded.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full min-w-0">
                      <div className="w-full max-w-full min-w-0 overflow-x-auto proposal-table-scroll rounded-lg border border-gray-100 bg-white" style={{ maxWidth: '100%' }}>
                        <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[650px]">
                          <thead>
                            <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              <th className="py-2 px-3 w-8 text-center">#</th>
                              <th className="py-2 px-3">Meal Slot</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3">Recipe / Food Item</th>
                              <th className="py-2 px-3 text-right">RMC Cost / Month</th>
                              <th className="py-2 px-3 text-right">LPG Cost / Month</th>
                              <th className="py-2 px-3 text-right">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {tableItems.map((slot, sIdx) => (
                              <tr key={slot.id || sIdx} className="hover:bg-gray-50/50">
                                <td className="py-2 px-3 text-center text-gray-400 text-[11px]">{sIdx + 1}</td>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                  {formatText(slot.slotName)}
                                </td>
                                <td className="py-2 px-3 text-gray-600">
                                  {formatText(slot.categoryName)}
                                </td>
                                <td className="py-2 px-3 font-medium text-[#084E92]">{slot.foodName}</td>
                                <td className="py-2 px-3 text-right text-gray-700">
                                  {formatCurrency(slot.monthlyRmcCost)}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-700">
                                  {formatCurrency(slot.monthlyLpgCost, '₹0.00')}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-gray-900">
                                  {formatCurrency(slot.totalCost)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Shift Slot Totals Summary */}
                      <div className="flex flex-wrap items-center justify-end gap-6 pt-1 text-[11px] text-gray-600 font-medium">
                        <span>
                          RMC Total: <strong className="text-gray-900 font-bold">{formatCurrency(shiftRmcTotal)}</strong>
                        </span>
                        <span>
                          LPG Total: <strong className="text-gray-900 font-bold">{formatCurrency(shiftLpgTotal)}</strong>
                        </span>
                        <span>
                          Shift Cost: <strong className="text-[#084E92] font-bold">{formatCurrency(shiftCostTotal)}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Terms and Conditions */}
      {sortedTerms.length > 0 && (
        <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-4 w-full max-w-full min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('terms')}
            className="w-full flex items-center justify-between border-b border-gray-100 pb-3 text-left focus:outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-[#084E92]" />
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#084E92] transition-colors">
                Terms & Conditions ({sortedTerms.length})
              </h3>
            </div>
            <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
              {openSections.terms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className={`proposal-section-content ${openSections.terms ? 'block' : 'hidden'} space-y-3 w-full max-w-full min-w-0`}>
            {sortedTerms.map((term, idx) => (
              <div key={term.id || idx} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/40 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">
                      {String(term.sequence || idx + 1).padStart(2, '0')}.
                    </span>
                    <h4 className="text-xs font-bold text-gray-900">
                      {term.termTitle || term.term || term.title || `Term ${idx + 1}`}
                    </h4>
                  </div>
                  {term.isMandatory !== false && (
                    <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 shrink-0">
                      Mandatory
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 pl-6 leading-relaxed">
                  {term.termDescription || term.details || term.description || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Audit Footer */}
      <div className="proposal-section-card bg-white border border-[#E7EAF0] rounded-2xl p-4 shadow-2xs text-[11px] text-gray-500 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('audit')}
          className="w-full flex items-center justify-between border-b border-gray-100 pb-2 text-left focus:outline-none cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#084E92]" />
            <span className="text-xs font-bold text-gray-800 group-hover:text-[#084E92] transition-colors">
              Audit & Timeline Information
            </span>
          </div>
          <div className="no-print p-1 rounded-lg text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100 transition">
            {openSections.audit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <div className={`proposal-section-content ${openSections.audit ? 'block' : 'hidden'} w-full max-w-full min-w-0`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Created At</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatDateTime(p.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Created By</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatText(p.createdByName || p.createdBy)}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Last Updated At</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatDateTime(p.updatedAt || p.modifiedAt)}</span>
            </div>
            <div>
              <span className="text-gray-400 block uppercase font-bold text-[9px] tracking-wider">Last Updated By</span>
              <span className="font-semibold text-gray-800 mt-0.5 block">{formatText(p.updatedByName || p.updatedBy || p.modifiedBy)}</span>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ProposalView;
