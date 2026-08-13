// Shared conversions between the /api/vendor/* payload shape and the
// shapes the UI already works with (form state + table rows).

// Unwraps varying API response shapes into a plain array or object.
export const extractList = (res) => {
  const body = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const key = Object.keys(body).find((k) => Array.isArray(body[k]));
    if (key) return body[key];
  }
  return [];
};

export const extractItem = (res) => res?.data?.data ?? res?.data ?? res;

export const DEFAULT_ADDRESS = {
  id: null,
  addressLine1: '',
  addressLine2: '',
  countryId: '',
  stateId: '',
  cityId: '',
  pincode: '',
  latitude: '',
  longitude: '',
};

export const makeBank = () => ({
  id: null,
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  reAccountNumber: '',
  ifsc: '',
  isPrimary: false,
});

export const DEFAULT_FORM = {
  // Personal information
  id: null,
  vendorName: '', // -> fullName
  username: '', // login username — required by backend, no prior UI field
  vendorCode: 'VEND-2023-001', // display-only, not sent to backend
  contactPersonName: '', // -> contactpersonName
  tradeName: '', // Company Name — defaults to vendorName, editable -> companyName
  email: '', // -> emailid
  password: '',
  mobile: '', // -> mobileNumber
  altMobile: '', // -> alternateMobile
  organizationId: '',
  roleId: '',

  // Business details
  gstin: '', // -> gstNumber
  gstCompanyName: '', // -> gstRegisteredName
  registeredName: '', // kept in form only — no matching backend field
  msmeRegistered: false, // -> isMsmeRegistered
  msmeType: '', // -> msmeRegistrationType
  msmeNumber: '', // -> msmeRegistrationNumber
  currency: 'INR - Indian Rupee',
  accountsPayable: 'Trade Creditors', // -> accountsPayableLedger
  openingBalance: '',
  paymentTerms: 'Due on Receipt',
  tdsApplicability: 'No TDS',

  // Common address -> sent as top-level fields on the payload (not addresses[])
  commonAddress: { ...DEFAULT_ADDRESS },
  // Billing / Shipping -> sent as entries in addresses[]
  billingAddress: { ...DEFAULT_ADDRESS },
  shippingAddress: { ...DEFAULT_ADDRESS },
  shippingSameAsBilling: true,

  // Bank details -> bankDetails[]
  banks: [makeBank()],

  // Remarks
  remarks: '',
};

const toAddressForm = (a = {}) => ({
  ...DEFAULT_ADDRESS,
  id: a.id ?? null,
  addressLine1: a.addressLine1 ?? '',
  addressLine2: a.addressLine2 ?? '',
  countryId: a.countryId ?? '',
  stateId: a.stateId ?? '',
  cityId: a.cityId ?? '',
  pincode: a.pincode ?? '',
  latitude: a.latitude ?? '',
  longitude: a.longitude ?? '',
});

// Vendor (from GET /vendor/:id) -> registration form state
export const mapVendorToForm = (vendor = {}) => {
  const addresses = vendor.addresses ?? [];
  // Backend uses lowercase "addresstype" and values like BILLING / SHIPPING.
  const billingRaw =
    addresses.find((a) => (a.addresstype ?? '').toUpperCase() === 'BILLING') ??
    {};
  const shippingRaw =
    addresses.find((a) => (a.addresstype ?? '').toUpperCase() === 'SHIPPING') ??
    {};

  const billingAddress = toAddressForm(billingRaw);
  const shippingAddress = toAddressForm(shippingRaw);
  const shippingSameAsBilling =
    JSON.stringify({ ...billingAddress, id: null }) ===
    JSON.stringify({ ...shippingAddress, id: null });

  // The vendor's own "common" address lives on the vendor root, not in addresses[].
  const commonAddress = toAddressForm({
    addressLine1: vendor.addressLine1,
    addressLine2: vendor.addressLine2,
    countryId: vendor.countryId,
    stateId: vendor.stateId,
    cityId: vendor.cityId,
    pincode: vendor.pincode,
    latitude: vendor.latitude,
    longitude: vendor.longitude,
  });

  const banks = (vendor.bankDetails ?? []).map((b) => ({
    id: b.id ?? null,
    accountHolderName: b.accountHolderName ?? '',
    bankName: b.bankName ?? '',
    accountNumber: b.accountNumber ?? '',
    reAccountNumber: b.accountNumber ?? '', 
    ifsc: b.ifscCode ?? '',
    isPrimary: !!b.isPrimary,
  }));

  return {
    ...DEFAULT_FORM,
    id: vendor.id ?? null,
    vendorName: vendor.fullName ?? vendor.name ?? '',
    username: vendor.username ?? '',
    vendorCode: vendor.code ?? DEFAULT_FORM.vendorCode,
    contactPersonName: vendor.contactpersonName ?? '',
    tradeName: vendor.companyName ?? vendor.fullName ?? '',
    email: vendor.emailid ?? '',
    mobile: vendor.mobileNumber ?? '',
    altMobile: vendor.alternateMobile ?? '',
    organizationId: vendor.organizationId ?? '',
    roleId: vendor.roleId ?? '',
    gstin: vendor.gstNumber ?? '',
    gstCompanyName: vendor.gstRegisteredName ?? '',
    registeredName: '',
    msmeRegistered: !!vendor.isMsmeRegistered,
    msmeType: vendor.msmeRegistrationType ?? '',
    msmeNumber: vendor.msmeRegistrationNumber ?? '',
    accountsPayable: vendor.accountsPayableLedger ?? DEFAULT_FORM.accountsPayable,
    openingBalance:
      vendor.openingBalance !== undefined && vendor.openingBalance !== null
        ? String(vendor.openingBalance)
        : '',
    paymentTerms: vendor.paymentTerms ?? DEFAULT_FORM.paymentTerms,
    tdsApplicability: vendor.tdsApplicability ?? DEFAULT_FORM.tdsApplicability,
    remarks: vendor.remarks ?? '',
    commonAddress,
    billingAddress,
    shippingAddress,
    shippingSameAsBilling,
    banks: banks.length > 0 ? banks : [makeBank()],
  };
};

// Builds one addresses[] entry (billing / shipping only — common address is
// sent flat on the payload root, see buildVendorPayload).
const buildAddressPayload = (address, type, { isEditMode, vendorId, phoneNumber }) => ({
  ...(isEditMode && address.id ? { id: address.id } : {}),
  ...(isEditMode && vendorId ? { vendorId } : {}),
  addresstype: type,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  countryId: address.countryId,
  stateId: address.stateId,
  cityId: address.cityId,
  pincode: address.pincode,
  latitude: address.latitude,
  longitude: address.longitude,
  phoneNumber: phoneNumber ?? '',
});

// Form state -> POST /vendor/save or PUT /vendor/update payload
export const buildVendorPayload = (form, { isEditMode, editingVendor }) => {
  const shippingSource = form.shippingSameAsBilling
    ? form.billingAddress
    : form.shippingAddress;
  const vendorId = isEditMode ? editingVendor?.id : undefined;

  return {
    ...(isEditMode && vendorId ? { id: vendorId } : {}),

    fullName: form.vendorName,
    username: form.username,
    contactpersonName: form.contactPersonName,
    companyName: form.tradeName,
    emailid: form.email,
    mobileNumber: form.mobile,
    alternateMobile: form.altMobile,
    organizationId: form.organizationId,
    roleId: form.roleId,

    gstNumber: form.gstin,
    gstRegisteredName: form.gstCompanyName,
    isMsmeRegistered: form.msmeRegistered,
    msmeRegistrationType: form.msmeRegistered ? form.msmeType : '',
    msmeRegistrationNumber: form.msmeRegistered ? form.msmeNumber : '',
    gstVerified: false,

    currency: 'INR',
    accountsPayableLedger: form.accountsPayable,
    openingBalance: form.openingBalance === '' ? 0 : Number(form.openingBalance),
    paymentTerms: form.paymentTerms,
    tdsApplicability: form.tdsApplicability,

    // Common address — flat on the payload root.
    addressLine1: form.commonAddress.addressLine1,
    addressLine2: form.commonAddress.addressLine2,
    countryId: form.commonAddress.countryId,
    stateId: form.commonAddress.stateId,
    cityId: form.commonAddress.cityId,
    pincode: form.commonAddress.pincode,
    latitude: form.commonAddress.latitude,
    longitude: form.commonAddress.longitude,

    // Billing / Shipping — entries in addresses[].
    addresses: [
      buildAddressPayload(form.billingAddress, 'BILLING', {
        isEditMode,
        vendorId,
        phoneNumber: form.mobile,
      }),
      buildAddressPayload(shippingSource, 'SHIPPING', {
        isEditMode,
        vendorId,
        phoneNumber: form.altMobile || form.mobile,
      }),
    ],

    bankDetails: form.banks.map((bank, index) => ({
      ...(isEditMode && bank.id ? { id: bank.id } : {}),
      ...(isEditMode && vendorId ? { vendorId } : {}),
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      ifscCode: bank.ifsc,
      isPrimary: index === 0, // first bank row treated as primary
      // NOTE: backend schema has a "username" field per bank entry with no
      // obvious UI equivalent — defaulting to accountHolderName. Confirm
      // with backend what this is actually meant to hold.
      username: bank.accountHolderName,
    })),

    remarks: form.remarks,
    password: form.password,
  };
};

// Vendor (from API) -> vendor listing table row
export const mapVendorToRow = (vendor = {}) => {
  const addresses = vendor.addresses ?? [];
  const billing =
    addresses.find((a) => (a.addresstype ?? '').toUpperCase() === 'BILLING') ??
    addresses[0] ??
    {};

  return {
    id: vendor.id,
    name: vendor.fullName ?? vendor.name ?? '',
    code: vendor.vendorCode ?? vendor.code ?? '',
    emailid: vendor.emailid ?? '',
    createdAt: vendor.createdAt,
    mobile: vendor.mobileNumber ?? '',
    altMobile: vendor.alternateMobile ?? '',
    contactPersonName: vendor.contactpersonName ?? '',
    company: vendor.companyName ?? '',
    category: vendor.category ?? '',
    organizationId: vendor.organizationId ?? '',
    roleId: vendor.roleId ?? '',
    gstin: vendor.gstNumber ?? '',
    gstCompanyName: vendor.gstRegisteredName ?? '',
    registeredName: '',
    kycStatus: vendor.kycStatus ?? 'pending',
    createdOn: vendor.createdAt
      ? new Date(vendor.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '',
    // "Address" in the listing table reflects the vendor's common (root) address.
    addressLine1: vendor.addressLine1 ?? '',
    addressLine2: vendor.addressLine2 ?? '',
    countryId: vendor.countryId ?? '',
    stateId: vendor.stateId ?? '',
    cityId: vendor.cityId ?? '',
    pincode: vendor.pincode ?? '',
    latitude: vendor.latitude ?? '',
    longitude: vendor.longitude ?? '',
    billingAddressLine1: billing.addressLine1 ?? '',
  };
};