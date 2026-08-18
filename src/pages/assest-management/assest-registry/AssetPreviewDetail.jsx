import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  ImageOff,
  Loader2,
  QrCode,
  Wrench,
  TrendingDown,
} from 'lucide-react';
import { getAssetById } from '@/services/apiServices';

// Same normalizer used elsewhere for {data:[...]}/{content:[...]}/[...] shapes
const unwrapOne = (res) => res?.data?.data ?? res?.data ?? null;


// API dates come back as "dd/mm/yyyy" (e.g. "01/06/2027"), not ISO —
// new Date() on that string directly gives an Invalid Date.
const parseDDMMYYYY = (str) => {
  if (!str) return null;
  const [day, month, year] = str.split('/');
  if (!day || !month || !year) return null;
  const d = new Date(`${year}-${month}-${day}`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (str) => {
  const d = parseDDMMYYYY(str);
  if (!d) return str ?? '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const WARRANTY_SOON_DAYS = 30;

// The raw asset-detail response has no precomputed "warranty" flag (that
// only exists on the row objects normalized in AssetsManagement), so derive
// it here too from warrantyEndDate. If a precomputed value is already
// present (e.g. still showing the table row while the fetch is in flight),
// that's used instead.
const getWarrantyState = (endDateStr) => {
  const end = parseDDMMYYYY(endDateStr);
  if (!end) return 'valid';
  const daysLeft = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 'expired';
  return daysLeft <= WARRANTY_SOON_DAYS ? 'expiring' : 'valid';
};

const formatCurrency = (val) =>
  val != null && val !== '' ? `₹${Number(val).toLocaleString()}` : '—';

// Backend serves images at /uploads/assets/... but currently returns the
// path with the segments joined incorrectly (/uploadsassets/...). Patch
// client-side until the API route is fixed.


const InfoCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
    <p className="text-sm text-gray-800 font-semibold mt-1">{value ?? '—'}</p>
  </div>
);

const SpecRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm text-gray-800 font-medium">{value ?? '—'}</span>
  </div>
);

const AssetPreviewDetail = ({ asset, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = asset?.id ?? asset?.assetId;

    if (!id) return;

    let cancelled = false;

    setLoading(true);
    setError(null);

    getAssetById(id)
      .then((res) => {
        if (cancelled) return;

        const detail = unwrapOne(res);

        setDetails(detail);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;

        console.error('Failed to load asset details:', error);
        setError('Could not load asset details.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset]);


  // Fall back to the row data passed in (from the table) while the fetch is in flight
  const data = details ?? asset ?? {};

  const latestImage =
  Array.isArray(data.images) && data.images.length > 0
    ? data.images[data.images.length - 1]
    : null;
  // Prefer the dedicated images endpoint; fall back to assetImagePaths
  // embedded directly on the asset-detail response if that call comes back empty.

  const warrantyState = data.warranty ?? getWarrantyState(data.warrantyEndDate ?? data.warrantyEnd);
  const assetCode = data.assetCode ?? data.assetId;
  const companyName = data.companyName ?? data.organizationName ?? data.orgName;
  const totalQty = data.totalQuantity;

  // QR encodes the asset code — scanning it is expected to deep-link back
  // to this asset's detail view.
  const qrUrl = assetCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(assetCode)}`
    : null;

  const warrantyStyles = {
    valid: { wrap: 'bg-green-50 border-green-100', icon: 'text-green-600', text: 'text-green-700', label: 'Warranty Valid' },
    expiring: { wrap: 'bg-amber-50 border-amber-100', icon: 'text-amber-600', text: 'text-amber-700', label: 'Valid (Expiring Soon)' },
    expired: { wrap: 'bg-red-50 border-red-100', icon: 'text-red-600', text: 'text-red-700', label: 'Warranty Expired' },
  };
  const wStyle = warrantyStyles[warrantyState] ?? warrantyStyles.valid;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-bold text-gray-800">Asset Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading asset...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* QR (left) + identity block (right) */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 shrink-0 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                {qrUrl ? (
                  <img src={qrUrl} alt={`QR code for ${assetCode}`} className="w-full h-full object-contain p-1" />
                ) : (
                  <QrCode className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{data.itemName ?? '—'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{assetCode}</p>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 text-xs text-gray-500">
                  {companyName && <span className="font-medium text-gray-600">{companyName}</span>}
                  {companyName && totalQty != null && <span className="text-gray-300">·</span>}
                  {totalQty != null && (
                    <span>
                      Qty: {data.availableQuantity ?? 0} available / {totalQty} total
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Full-width image gallery */}
            <div>
              {latestImage?.path ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  <img
                    src={latestImage.path}
                    alt={data.itemName ?? 'Asset'}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-xs">No image uploaded</span>
                </div>
              )}
            </div>

            {/* Current status pill */}
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Current Status
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                {data.status ?? data.statusName ?? '—'}
              </span>
            </div>

            {/* Operational context */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#084E92] font-bold mb-2.5">
                Operational Context
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Category" value={data.category ?? data.categoryName} />
                <InfoCard label="Sub Category" value={data.subCategory ?? data.subCategoryName} />
                <InfoCard label="Asset Type" value={data.assetTypeName} />
                <InfoCard label="Assigned To" value={data.assignedTo ?? data.assignedToName ?? "Not In Use"} />
              </div>
            </div>

            {/* Technical specifications */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench className="w-3.5 h-3.5 text-[#084E92]" />
                <p className="text-[11px] uppercase tracking-wide text-[#084E92] font-bold">
                  Technical Specifications
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 px-3.5">
                <SpecRow label="Brand" value={data.brand ?? data.brandName} />
                <SpecRow label="Model" value={data.modelNumber} />
                <SpecRow label="Serial Number" value={data.serialNumber} />
                <SpecRow label="Purchase Date" value={formatDate(data.purchaseDate)} />
              </div>
            </div>

            {/* Warranty banner */}
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${wStyle.wrap}`}>
              {warrantyState === 'valid' ? (
                <ShieldCheck size={16} className={wStyle.icon} />
              ) : (
                <AlertTriangle size={16} className={wStyle.icon} />
              )}
              <div>
                <p className={`text-[10px] uppercase tracking-wide font-semibold ${wStyle.text} opacity-80`}>
                  Warranty Status
                </p>
                <p className={`text-sm font-bold ${wStyle.text}`}>{wStyle.label}</p>
              </div>
            </div>

            {/* Value + depreciation */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Asset Value" value={formatCurrency(data.currentValue ?? data.value ?? data.purchaseCost)} />
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Depreciation</p>
                <p className="text-sm font-semibold mt-1 flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {data.depreciationPercent != null ? `${data.depreciationPercent}%/annum` : '—'}
                </p>
              </div>
            </div>

            {/* Activity timeline, if the API returns one */}
            {Array.isArray(data.activities) && data.activities.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-3">
                  Activity
                </p>
                <div className="space-y-4 border-l border-gray-200 pl-4">
                  {data.activities.map((a, i) => (
                    <div key={i} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${a.active ? 'bg-[#084E92]' : 'bg-gray-300'
                          }`}
                      />
                      <p className="text-sm font-medium text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssetPreviewDetail;