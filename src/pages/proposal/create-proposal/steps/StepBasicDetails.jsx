import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Save, Loader2 } from 'lucide-react';
import {
  getAllStates,
  getOutletsLookup,
  getAllSubLocationsByOrganizationId,
  getAllProposalTypes,
  getProposalTypesLookup,
  getFoodPreferencesLookup,
  getPaymentModesLookup,
} from '@/services/apiServices';
import SearchableSelect from '@/utils/SearchableSelect';
import { extractArray, toInputDate } from '../types';

const cleanStateName = (name) => {
  if (!name) return '';
  return name.replace(/\s*\((Zone\s*[A-Za-z0-9]+)\)/gi, '').trim();
};

let cachedProposalTypes = null;
let cachedFoodPreferences = null;
let cachedPaymentModes = null;

export const StepBasicDetails = ({
  data,
  onChange,
  onSaveDraft,
  onSaveContinue,
  onNext,
  onCancel,
  saving = false,
  isSentForApproval = false,
}) => {
  const statusStr = String(data?.status || '').toUpperCase().trim();
  const isSent = isSentForApproval || (Boolean(statusStr) && statusStr !== 'DRAFT');

  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);

  const [outlets, setOutlets] = useState([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  const [subOutlets, setSubOutlets] = useState([]);
  const [loadingSubOutlets, setLoadingSubOutlets] = useState(false);

  const stateOptions = useMemo(() => {
    return states.map((st) => ({
      value: String(st.id),
      label: st.name || st.stateName,
    }));
  }, [states]);

  const outletOptions = useMemo(() => {
    return outlets.map((u) => ({
      value: String(u.id),
      label: u.label || u.name,
    }));
  }, [outlets]);

  const subOutletOptions = useMemo(() => {
    return subOutlets.map((so) => ({
      value: String(so.id),
      label: so.name || so.subLocationName,
    }));
  }, [subOutlets]);

  const [proposalTypes, setProposalTypes] = useState([
    { id: 1, value: '1', name: 'Institutional', label: 'Institutional', code: 'INSTITUTIONAL' },
    { id: 2, value: '2', name: 'Industrial', label: 'Industrial', code: 'INDUSTRIAL' },
  ]);
  const [foodPreferences, setFoodPreferences] = useState([
    { value: 'SUBSIDIZED', label: 'Subsidized' },
    { value: 'NON_SUBSIDIZED', label: 'Non-Subsidized' },
  ]);
  const [paymentModes, setPaymentModes] = useState([
    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
    { value: 'CREDIT_30_DAYS', label: '30 Days Credit' },
    { value: 'CREDIT_15_DAYS', label: '15 Days Credit' },
    { value: 'ADVANCE', label: '100% Advance Payment' },
    { value: 'PDC', label: 'Post-Dated Cheque (PDC)' },
  ]);

  const [errors, setErrors] = useState({});

  // 1. Load States via getAllStates API
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await getAllStates();
        const raw = extractArray(res);
        if (Array.isArray(raw) && raw.length > 0) {
          const mapped = raw.map((st) => ({
            id: String(st.id ?? st.stateId ?? st.value),
            name: cleanStateName(st.name || st.stateName || st.label || `State #${st.id ?? st.value}`),
          }));
          setStates(mapped);
          if (data?.stateId && !data?.stateName) {
            const matched = mapped.find((s) => String(s.id) === String(data.stateId));
            if (matched) {
              onChange({ stateName: matched.name });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load states from getAllStates API:', err);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // 2. Load Outlets based on selected State (passing stateId to getOutletsLookup)
  useEffect(() => {
    if (!data.stateId) {
      setOutlets([]);
      return;
    }

    const fetchOutletsForState = async () => {
      setLoadingOutlets(true);
      try {
        const res = await getOutletsLookup(data.stateId);
        const list = extractArray(res);
        if (list.length > 0) {
          const mapped = list.map((u) => {
            const displayName =
              u.companyNameEnglish ||
              u.name ||
              u.outletName ||
              u.organizationName ||
              u.label ||
              `Outlet #${u.id}`;
            const labelParts = [displayName];
            if (u.cityName) labelParts.push(`(${u.cityName})`);
            if (u.companyCode) labelParts.push(`- ${u.companyCode}`);

            return {
              id: String(u.id ?? u.outletId ?? u.value),
              name: displayName,
              label: labelParts.join(' '),
              companyNameEnglish: u.companyNameEnglish || displayName,
              companyCode: u.companyCode || u.shortCode || '',
              shortCode: u.shortCode || '',
              cityId: u.cityId,
              cityName: u.cityName || '',
              stateId: u.stateId,
              stateName: u.stateName || '',
            };
          });
          setOutlets(mapped);
        } else {
          setOutlets([]);
        }
      } catch (err) {
        console.error('Failed to load units for state:', err);
        setOutlets([]);
      } finally {
        setLoadingOutlets(false);
      }
    };

    fetchOutletsForState();
  }, [data.stateId]);

  // Load other lookups on mount
  useEffect(() => {
    const fetchLookups = async () => {
      if (cachedProposalTypes && cachedFoodPreferences && cachedPaymentModes) {
        setProposalTypes(cachedProposalTypes);
        setFoodPreferences(cachedFoodPreferences);
        setPaymentModes(cachedPaymentModes);
        return;
      }
      try {
        const [typesRes, foodRes, payRes] = await Promise.allSettled([
          getAllProposalTypes().catch(() => getProposalTypesLookup()),
          getFoodPreferencesLookup(),
          getPaymentModesLookup(),
        ]);
        if (typesRes.status === 'fulfilled') {
          const payload = typesRes.value?.data?.data ?? typesRes.value?.data ?? [];
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.content)
                ? payload.content
                : extractArray(typesRes.value);

          if (Array.isArray(list) && list.length > 0) {
            const mapped = list
              .filter((item) => item.isActive !== false)
              .map((item) => {
                if (typeof item === 'string') {
                  return { id: null, value: item, name: item, label: item.replace(/_/g, ' '), code: item };
                }
                const id = item.id != null ? Number(item.id) : null;
                const name = item.name || item.proposalTypeName || item.label || item.code || '';
                const code = item.code || item.value || '';
                const label = name || code || (id ? `Type #${id}` : '');
                return {
                  id,
                  value: id != null ? String(id) : (code || label),
                  name,
                  code,
                  label,
                  raw: item,
                };
              });
            if (mapped.length > 0) {
              cachedProposalTypes = mapped;
              setProposalTypes(mapped);
            }
          }
        }
        if (foodRes.status === 'fulfilled') {
          const list = extractArray(foodRes.value);
          if (list.length > 0) {
            const mapped = list.map((item) =>
              typeof item === 'string'
                ? { value: item, label: item.replace(/_/g, ' ') }
                : { value: item.code || item.value || item.id, label: item.name || item.label }
            );
            cachedFoodPreferences = mapped;
            setFoodPreferences(mapped);
          }
        }
        if (payRes.status === 'fulfilled') {
          const list = extractArray(payRes.value);
          if (list.length > 0) {
            const mapped = list.map((item) =>
              typeof item === 'string'
                ? { value: item, label: item.replace(/_/g, ' ') }
                : { value: item.code || item.value || item.id, label: item.name || item.label }
            );
            cachedPaymentModes = mapped;
            setPaymentModes(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load basic details lookups:', err);
      }
    };

    fetchLookups();
  }, []);

  // Auto-sync proposalTypeId if proposalType exists or proposalTypes load
  useEffect(() => {
    if (proposalTypes.length === 0) return;

    // Case 1: proposalTypeId is already set
    if (data.proposalTypeId != null && data.proposalTypeId !== '') {
      const matched = proposalTypes.find(
        (pt) => pt.id != null && String(pt.id) === String(data.proposalTypeId)
      );
      if (matched && (!data.proposalType || data.proposalType !== (matched.name || matched.label))) {
        onChange({ proposalType: matched.name || matched.label });
      }
      return;
    }

    // Case 2: proposalTypeId is missing, but proposalType is present
    if (data.proposalType) {
      const match = proposalTypes.find(
        (pt) =>
          pt.id != null &&
          (String(pt.value) === String(data.proposalType) ||
            String(pt.id) === String(data.proposalType) ||
            String(pt.code || '').toUpperCase() === String(data.proposalType).toUpperCase() ||
            String(pt.label || '').toUpperCase() === String(data.proposalType).toUpperCase() ||
            String(pt.name || '').toUpperCase() === String(data.proposalType).toUpperCase())
      );
      if (match?.id != null) {
        onChange({
          proposalTypeId: Number(match.id),
          proposalType: match.name || match.label || data.proposalType,
        });
        return;
      }
    }

    // Case 3: If no proposalTypeId is set and proposalTypes has items with id, auto-sync to first valid option
    if ((!data.proposalTypeId || data.proposalTypeId === '') && proposalTypes.length > 0 && proposalTypes[0].id != null) {
      onChange({
        proposalTypeId: Number(proposalTypes[0].id),
        proposalType: proposalTypes[0].name || proposalTypes[0].label,
      });
    }
  }, [proposalTypes, data.proposalType, data.proposalTypeId]);

  // Fetch Sub-Outlets when organizationId (outlet) changes
  useEffect(() => {
    if (!data.organizationId) {
      setSubOutlets([]);
      return;
    }
    const fetchSubOutlets = async () => {
      setLoadingSubOutlets(true);
      try {
        const res = await getAllSubLocationsByOrganizationId(data.organizationId);
        setSubOutlets(extractArray(res));
      } catch (err) {
        console.error('Failed to fetch sub-locations:', err);
      } finally {
        setLoadingSubOutlets(false);
      }
    };
    fetchSubOutlets();
  }, [data.organizationId]);

  const handleFieldChange = (field, value) => {
    onChange({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleStateChange = (stateId) => {
    const selected = states.find((s) => String(s.id) === String(stateId));
    onChange({
      stateId,
      stateName: selected?.name || '',
      organizationId: '',
      subOutletId: '',
    });
    if (errors.stateId) {
      setErrors((prev) => ({ ...prev, stateId: '' }));
    }
  };

  const handleOutletChange = (orgId) => {
    const selected = outlets.find((o) => String(o.id) === String(orgId));
    onChange({
      organizationId: orgId,
      outletName: selected?.companyNameEnglish || selected?.name || '',
      outletCode: selected?.companyCode || '',
      cityName: selected?.cityName || '',
      cityId: selected?.cityId || '',
      subOutletId: '',
    });
    if (errors.organizationId) {
      setErrors((prev) => ({ ...prev, organizationId: '' }));
    }
  };

  const validate = () => {
    const err = {};
    if (!data.proposalTypeId) err.proposalType = 'Proposal type is required';
    if (!data.clientName?.trim()) err.clientName = 'Client name is required';
    if (!data.clientContactPerson?.trim()) err.clientContactPerson = 'Contact person is required';
    if (!data.clientPhone?.trim()) err.clientPhone = 'Mobile number is required';
    if (!data.clientEmail?.trim()) err.clientEmail = 'Email is required';
    if (!data.proposalDate) err.proposalDate = 'Proposal date is required';
    if (!data.validityDate) err.validityDate = 'Valid until date is required';
    if (!data.foodPreference) err.foodPreference = 'Food option is required';
    if (!data.paymentMode) err.paymentMode = 'Mode of payment is required';
    if (!data.serviceStartDate) err.serviceStartDate = 'Service start date is required';
    if (!data.serviceEndDate) err.serviceEndDate = 'Service end date is required';
    if (!data.stateId) err.stateId = 'State is required';
    if (!data.organizationId) err.organizationId = 'Outlet is required';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleDraftClick = (e) => {
    e?.preventDefault?.();
    if (!data.proposalTypeId) {
      setErrors((prev) => ({ ...prev, proposalType: 'Proposal type is required' }));
      return;
    }
    onSaveDraft();
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (validate()) {
      onSaveContinue();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Proposal Details Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Proposal Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Proposal Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Proposal Type <span className="text-red-500">*</span>
            </label>
            <select
              value={
                data.proposalTypeId != null && data.proposalTypeId !== ''
                  ? String(data.proposalTypeId)
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  onChange({
                    proposalTypeId: null,
                    proposalType: '',
                  });
                  return;
                }
                const selected = proposalTypes.find(
                  (pt) =>
                    (pt.id != null && String(pt.id) === String(val)) ||
                    String(pt.value) === String(val)
                );
                const newTypeId =
                  selected?.id != null
                    ? Number(selected.id)
                    : !isNaN(Number(val)) && Number(val) > 0
                    ? Number(val)
                    : null;
                const newTypeName = selected?.name || selected?.label || val;
                onChange({
                  proposalTypeId: newTypeId,
                  proposalType: newTypeName,
                });
                if (errors.proposalType) {
                  setErrors((prev) => ({ ...prev, proposalType: '' }));
                }
              }}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${
                errors.proposalType ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
              }`}
            >
              <option value="">Select proposal type</option>
              {proposalTypes.map((pt) => (
                <option key={pt.id != null ? `pt-${pt.id}` : pt.value} value={pt.id != null ? String(pt.id) : pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            {errors.proposalType && <p className="text-[11px] text-red-500 mt-1">{errors.proposalType}</p>}
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.clientName || ''}
              onChange={(e) => handleFieldChange('clientName', e.target.value)}
              placeholder="Enter client name"
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.clientName ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.clientName && <p className="text-[11px] text-red-500 mt-1">{errors.clientName}</p>}
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Contact Person <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.clientContactPerson || ''}
              onChange={(e) => handleFieldChange('clientContactPerson', e.target.value)}
              placeholder="Enter contact person"
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.clientContactPerson ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.clientContactPerson && (
              <p className="text-[11px] text-red-500 mt-1">{errors.clientContactPerson}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={data.clientPhone || ''}
              onChange={(e) => handleFieldChange('clientPhone', e.target.value)}
              placeholder="Enter mobile number"
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.clientPhone ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.clientPhone && <p className="text-[11px] text-red-500 mt-1">{errors.clientPhone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.clientEmail || ''}
              onChange={(e) => handleFieldChange('clientEmail', e.target.value)}
              placeholder="Enter email address"
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.clientEmail ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.clientEmail && <p className="text-[11px] text-red-500 mt-1">{errors.clientEmail}</p>}
          </div>

          {/* Proposal Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Proposal Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toInputDate(data.proposalDate) || ''}
              onChange={(e) => handleFieldChange('proposalDate', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.proposalDate ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.proposalDate && <p className="text-[11px] text-red-500 mt-1">{errors.proposalDate}</p>}
          </div>

          {/* Valid Until */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Valid Until <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toInputDate(data.validityDate) || ''}
              onChange={(e) => handleFieldChange('validityDate', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.validityDate ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.validityDate && <p className="text-[11px] text-red-500 mt-1">{errors.validityDate}</p>}
          </div>

          {/* Food Option */}
          {/* <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Food <span className="text-red-500">*</span>
            </label>
            <select
              value={data.foodPreference || ''}
              onChange={(e) => handleFieldChange('foodPreference', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.foodPreference ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            >
              <option value="">Select food option</option>
              {foodPreferences.map((fp) => (
                <option key={fp.value} value={fp.value}>
                  {fp.label}
                </option>
              ))}
            </select>
            {errors.foodPreference && (
              <p className="text-[11px] text-red-500 mt-1">{errors.foodPreference}</p>
            )}
          </div> */}

          {/* Mode of Payment */}
          {/* <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mode of Payment <span className="text-red-500">*</span>
            </label>
            <select
              value={data.paymentMode || ''}
              onChange={(e) => handleFieldChange('paymentMode', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.paymentMode ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            >
              <option value="">Select payment mode</option>
              {paymentModes.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
            {errors.paymentMode && <p className="text-[11px] text-red-500 mt-1">{errors.paymentMode}</p>}
          </div> */}

          {/* Tentative Start Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tentative Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toInputDate(data.serviceStartDate) || ''}
              onChange={(e) => handleFieldChange('serviceStartDate', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.serviceStartDate ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.serviceStartDate && (
              <p className="text-[11px] text-red-500 mt-1">{errors.serviceStartDate}</p>
            )}
          </div>

          {/* Service End Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tentative End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toInputDate(data.serviceEndDate) || ''}
              onChange={(e) => handleFieldChange('serviceEndDate', e.target.value)}
              className={`w-full h-10 px-3.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 transition ${errors.serviceEndDate ? 'border-red-500' : 'border-[#C3C6D1] focus:border-[#084E92]'
                }`}
            />
            {errors.serviceEndDate && (
              <p className="text-[11px] text-red-500 mt-1">{errors.serviceEndDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Reference Unit Section */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Reference Unit</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              State <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              name="stateId"
              value={data.stateId || ''}
              onChange={(e) => {
                const val = e?.target?.value ?? e?.value ?? '';
                handleStateChange(val);
              }}
              options={stateOptions}
              placeholder={loadingStates ? 'Loading states...' : 'Select state'}
              disabled={loadingStates}
              hasError={Boolean(errors.stateId)}
              isClearable={false}
              className="h-10 text-xs rounded-xl"
            />
            {errors.stateId && <p className="text-[11px] text-red-500 mt-1">{errors.stateId}</p>}
          </div>

          {/* Outlet */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Units <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              name="organizationId"
              value={data.organizationId || ''}
              onChange={(e) => {
                const val = e?.target?.value ?? e?.value ?? '';
                handleOutletChange(val);
              }}
              options={outletOptions}
              placeholder={
                !data.stateId
                  ? 'Select state first'
                  : loadingOutlets
                    ? 'Loading units...'
                    : outlets.length === 0
                      ? 'No units found for selected state'
                      : 'Select unit'
              }
              disabled={!data.stateId || loadingOutlets || outlets.length === 0}
              hasError={Boolean(errors.organizationId)}
              isClearable={false}
              className="h-10 text-xs rounded-xl"
            />
            {errors.organizationId && (
              <p className="text-[11px] text-red-500 mt-1">{errors.organizationId}</p>
            )}
            {!loadingOutlets && data.stateId && outlets.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                No units found for the selected state.
              </p>
            )}
          </div>

          {/* Sub-Outlet */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Sub-Units
            </label>
            <SearchableSelect
              name="subOutletId"
              value={data.subOutletId || ''}
              onChange={(e) => {
                const val = e?.target?.value ?? e?.value ?? '';
                handleFieldChange('subOutletId', val);
              }}
              options={subOutletOptions}
              placeholder={
                !data.organizationId
                  ? 'Select unit first'
                  : loadingSubOutlets
                    ? 'Loading sub-units...'
                    : subOutlets.length === 0
                      ? 'No sub-units available'
                      : 'Select sub-unit'
              }
              disabled={!data.organizationId || loadingSubOutlets || subOutlets.length === 0}
              isClearable={true}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={handleDraftClick}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSent ? 'Save' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepBasicDetails;
