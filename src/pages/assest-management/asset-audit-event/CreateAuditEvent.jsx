import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
    Loader2,
    Play,
    Pause,
    CheckCircle2,
    Ban,
    ArrowLeft,
    ScanLine,
    Plus,
    AlertTriangle,
    CalendarClock,
    Save,
    ChevronDown,
    ChevronRight,
    Barcode,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import { PageErrorAlert } from "@/components/common/PageErrorAlert";
import SearchableSelect from "../../../utils/SearchableSelect";
import { useOrgScope } from "@/hooks/useOrgScope";
import { notify } from "@/utils/toast";
import {
    getAllSubOutletsByOrganization,
    getAllSubLocationsByOrganizationId,
    getAssetUnitLocationsByOrganization,
    createAssetAuditEvent,
    scanAssetAuditQr,
    updateAssetAuditStatus,
    getScanReportById,
    updateAssetAuditEvent,
} from "../../../services/apiServices";

const extractArray = (res) => {
    if (!res) return [];
    const raw = res?.data?.data ?? res?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.content)) return raw.content;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
};

/**
 * Parses "DD/MM/YYYY hh:mm:ss A" into a standard Date object
 */
const parseAuditDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const parts = dateTimeStr.trim().split(" ");
    if (parts.length < 2) return new Date(dateTimeStr);

    const [day, month, year] = parts[0].split("/").map(Number);
    const timeParts = parts[1].split(":").map(Number);
    let hours = timeParts[0];
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;
    const modifier = parts[2]?.toUpperCase();

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes, seconds);
};

const formatToAuditDateTime = (dateStr, timeSuffix) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year} ${timeSuffix}`;
};

const convertToInputDateFormat = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const parsed = parseAuditDateTime(dateTimeStr);
    if (!parsed || isNaN(parsed.getTime())) return "";
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const CreateAuditEvent = () => {
    const navigate = useNavigate();
    const { id: routeEventId } = useParams();
    const [searchParams] = useSearchParams();

    const {
        loading: orgScopeLoading,
        showUnitDropdown,
        effectiveOutletId,
        isOutletUser,
        units: scopeUnits,
        selfOrg,
    } = useOrgScope();

    // Organization Cascading State
    const [outletId, setOutletId] = useState("");
    const [subOutletId, setSubOutletId] = useState("");
    const [unitLocationId, setUnitLocationId] = useState("");
    const [subLocationId, setSubLocationId] = useState("");

    // Options State
    const [subOutlets, setSubOutlets] = useState([]);
    const [unitLocations, setUnitLocations] = useState([]);
    const [subLocations, setSubLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Form Fields
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [rawStartDateTime, setRawStartDateTime] = useState("");
    const [rawEndDateTime, setRawEndDateTime] = useState("");
    const [remarks, setRemarks] = useState("");

    // Lifecycle States
    const [auditEventId, setAuditEventId] = useState(routeEventId ? Number(routeEventId) : null);
    const [eventCode, setEventCode] = useState("");
    const [auditStatus, setAuditStatus] = useState(routeEventId ? "NOT_STARTED" : "UNCREATED");
    const [savingAction, setSavingAction] = useState(false);
    const [updatingDate, setUpdatingDate] = useState(false);
    const [error, setError] = useState(null);

    // Scanned Report & Aggregated Asset Details State
    const [assetDetails, setAssetDetails] = useState([]);
    const [totalAssetsScanned, setTotalAssetsScanned] = useState(0);
    const [totalItemsScanned, setTotalItemsScanned] = useState(0);
    const [expandedAssetIds, setExpandedAssetIds] = useState(new Set());

    // Scanner Controls
    const [scanMessage, setScanMessage] = useState("");
    const [gunInput, setGunInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    // Hardware & Scanner Refs
    const isProcessingRef = useRef(false);
    const lastScannedCodeRef = useRef("");
    const debounceTimerRef = useRef(null);
    const tableBottomRef = useRef(null);
    const gunInputRef = useRef(null);
    const endDateInputRef = useRef(null);

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.gain || audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 950;
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } catch {
            // AudioContext unavailable
        }
    };

    // Expiry calculation based on end date
    const isAuditExpired = useMemo(() => {
        if (!rawEndDateTime && !endDate) return false;
        const end = rawEndDateTime ? parseAuditDateTime(rawEndDateTime) : new Date(`${endDate}T23:59:59`);
        return end && !isNaN(end.getTime()) ? new Date() > end : false;
    }, [rawEndDateTime, endDate]);

    const isTerminalState = auditStatus === "COMPLETED" || auditStatus === "CANCELLED";

    const outletOptions = useMemo(() => {
        let list = Array.isArray(scopeUnits) ? scopeUnits : [];
        list = list.filter((u) => u?.id != null && String(u.id).toUpperCase() !== "ALL");
        if (list.length === 0 && selfOrg?.id) list = [selfOrg];

        return list.map((unit) => {
            const name = unit.companyNameEnglish || unit.companyName || unit.name || `Outlet #${unit.id}`;
            const code = unit.companyCode || unit.code || "";
            return {
                value: String(unit.id),
                label: code ? `${name} (${code})` : name,
            };
        });
    }, [scopeUnits, selfOrg]);

    // Initial Scope Setting
    useEffect(() => {
        if (orgScopeLoading || auditEventId) return;
        if (isOutletUser && !showUnitDropdown && effectiveOutletId) {
            setOutletId(String(effectiveOutletId));
        } else {
            setOutletId("");
            setSubOutletId("");
            setUnitLocationId("");
            setSubLocationId("");
        }
    }, [orgScopeLoading, isOutletUser, showUnitDropdown, effectiveOutletId, auditEventId]);

    // Load Sub Outlets
    useEffect(() => {
        if (!outletId || outletId === "0" || (showUnitDropdown && !outletId)) {
            setSubOutlets([]);
            setSubOutletId("");
            return;
        }

        let isMounted = true;
        const fetchSubOutlets = async () => {
            try {
                const res = await getAllSubOutletsByOrganization(outletId);
                if (isMounted) setSubOutlets(extractArray(res));
            } catch (err) {
                if (isMounted) setSubOutlets([]);
            }
        };
        fetchSubOutlets();
        return () => { isMounted = false; };
    }, [outletId, showUnitDropdown]);

    // Load Unit Locations & Sub Locations
    useEffect(() => {
        if (!outletId || outletId === "0" || (showUnitDropdown && !outletId)) {
            setUnitLocations([]);
            setSubLocations([]);
            setUnitLocationId("");
            setSubLocationId("");
            return;
        }

        let isMounted = true;
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const [unitLocRes, subLocRes] = await Promise.all([
                    getAssetUnitLocationsByOrganization(outletId),
                    getAllSubLocationsByOrganizationId(outletId),
                ]);

                if (!isMounted) return;
                setUnitLocations(extractArray(unitLocRes));

                let subList = extractArray(subLocRes);
                if (subOutletId) {
                    subList = subList.filter(
                        (loc) => String(loc.subOutletId || loc.subUnitId) === String(subOutletId)
                    );
                }
                setSubLocations(subList);
            } catch (err) {
                if (isMounted) {
                    setUnitLocations([]);
                    setSubLocations([]);
                }
            } finally {
                if (isMounted) setLoadingLocations(false);
            }
        };
        fetchLocations();
        return () => { isMounted = false; };
    }, [outletId, subOutletId, showUnitDropdown]);

    // Function to reload full audit report state
    const fetchLatestReport = useCallback(async (eventId) => {
        if (!eventId) return;
        try {
            const res = await getScanReportById(eventId);
            const reportData = res?.data?.data || res?.data;

            if (reportData) {
                setAuditEventId(Number(reportData.auditEventId || reportData.id));
                setEventCode(reportData.eventCode || "");
                setOutletId(String(reportData.organizationId || ""));
                setSubOutletId(String(reportData.subOutletId || ""));
                setUnitLocationId(String(reportData.assetUnitLocationId || ""));
                setSubLocationId(String(reportData.assetSubLocationId || ""));
                setRemarks(reportData.remarks || "");
                setAuditStatus(reportData.status || "NOT_STARTED");
                setTotalAssetsScanned(reportData.totalAssetsScanned ?? 0);
                setTotalItemsScanned(reportData.totalItemsScanned ?? 0);

                if (Array.isArray(reportData.assetDetails)) {
                    setAssetDetails(reportData.assetDetails);
                }

                if (reportData.auditStartDateTime) {
                    setRawStartDateTime(reportData.auditStartDateTime);
                    setStartDate(convertToInputDateFormat(reportData.auditStartDateTime));
                }
                if (reportData.auditEndDateTime) {
                    setRawEndDateTime(reportData.auditEndDateTime);
                    setEndDate(convertToInputDateFormat(reportData.auditEndDateTime));
                }
            }
        } catch (err) {
            setError("Failed to fetch audit report details.");
        }
    }, []);

    // Initial load when opening existing audit event
    useEffect(() => {
        if (!routeEventId) return;
        fetchLatestReport(routeEventId);

        if (searchParams.get("mode") === "edit-date") {
            setTimeout(() => endDateInputRef.current?.focus(), 300);
        }
    }, [routeEventId, searchParams, fetchLatestReport]);

    // Auto focus scanner input when audit is active
    useEffect(() => {
        if (auditStatus === "STARTED" && !isAuditExpired) {
            gunInputRef.current?.focus();
        }
    }, [auditStatus, isAuditExpired]);

    // Accordion toggle handler for subDetails
    const toggleAssetExpansion = (assetId) => {
        setExpandedAssetIds((prev) => {
            const next = new Set(prev);
            if (next.has(assetId)) {
                next.delete(assetId);
            } else {
                next.add(assetId);
            }
            return next;
        });
    };

    // QR Scanning handler (calls scan API -> then immediately syncs report API)
    const handleProcessScan = useCallback(async (rawUuid) => {
        const trimmedUuid = (rawUuid || "").trim();
        if (!trimmedUuid || isProcessingRef.current || !auditEventId || auditStatus !== "STARTED") {
            return;
        }

        if (isAuditExpired) {
            notify.error("Audit window has elapsed. Extend the end date before scanning.");
            return;
        }

        // Cancel any pending debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        isProcessingRef.current = true;
        setIsScanning(true);
        setScanMessage(`Scanning QR: ${trimmedUuid}...`);

        try {
            const payload = {
                auditEventId: Number(auditEventId),
                uuid: trimmedUuid,
                organizationId: Number(outletId) || 0,
                subOutletId: Number(subOutletId) || 0,
                assetUnitLocationId: Number(unitLocationId) || 0,
                assetSubLocationId: Number(subLocationId) || 0,
                scanBy: 1,
            };

            await scanAssetAuditQr(payload);
            playBeep();
            lastScannedCodeRef.current = trimmedUuid;
            setScanMessage(`Logged asset: ${trimmedUuid}`);
            setGunInput("");

            // Re-fetch report after each successful scan to update quantities & subDetails
            await fetchLatestReport(auditEventId);
        } catch (err) {
            setScanMessage(`Scan rejected for ${trimmedUuid}`);
            setGunInput("");
        } finally {
            setTimeout(() => {
                isProcessingRef.current = false;
                setIsScanning(false);
                lastScannedCodeRef.current = "";
                gunInputRef.current?.focus();
            }, 400);
        }
    }, [auditEventId, auditStatus, outletId, subOutletId, unitLocationId, subLocationId, isAuditExpired, fetchLatestReport]);

    // Input change and auto-trigger on complete UUID
    const onInputChange = (e) => {
        const value = e.target.value;
        setGunInput(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (value.trim().length >= 36) {
            debounceTimerRef.current = setTimeout(() => {
                handleProcessScan(value);
            }, 350);
        }
    };

    // Auto-focus listener with paste protection
    useEffect(() => {
        if (auditStatus !== "STARTED" || isAuditExpired) return;

        const handleGlobalKeyDown = (e) => {
            if (
                e.target !== gunInputRef.current &&
                (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")
            ) {
                return;
            }

            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            if (
                e.key === "Shift" ||
                e.key === "Control" ||
                e.key === "Alt" ||
                e.key === "Meta" ||
                e.key === "Tab" ||
                e.key === "Escape"
            ) {
                return;
            }

            if (document.activeElement !== gunInputRef.current) {
                gunInputRef.current?.focus();
                if (e.key.length === 1) {
                    setGunInput((prev) => prev + e.key);
                }
            }
        };

        const handleGlobalPaste = (e) => {
            if (
                e.target !== gunInputRef.current &&
                (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")
            ) {
                return;
            }

            const pastedData = (e.clipboardData || window.clipboardData).getData("text");
            if (pastedData) {
                e.preventDefault();
                gunInputRef.current?.focus();
                const sanitized = pastedData.trim();
                setGunInput(sanitized);
                handleProcessScan(sanitized);
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        window.addEventListener("paste", handleGlobalPaste);

        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown);
            window.removeEventListener("paste", handleGlobalPaste);
        };
    }, [auditStatus, isAuditExpired, handleProcessScan]);

    // Phase 1: Handle Event Creation
    const handleCreateEvent = async () => {
        if (!outletId) {
            notify.error("Please select a Unit");
            return;
        }
        if (!startDate || !endDate) {
            notify.error("Please select Start and End dates");
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            notify.error("End date cannot be earlier than start date");
            return;
        }

        setSavingAction(true);
        setError(null);

        const formattedStart = formatToAuditDateTime(startDate, "12:00:00 AM");
        const formattedEnd = formatToAuditDateTime(endDate, "11:59:59 PM");

        const payload = {
            organizationId: Number(outletId),
            subOutletId: Number(subOutletId) || 0,
            assetUnitLocationId: Number(unitLocationId) || 0,
            assetSubLocationId: Number(subLocationId) || 0,
            auditStartDateTime: formattedStart,
            auditEndDateTime: formattedEnd,
            createdBy: 1,
            remarks: remarks.trim(),
        };

        try {
            const res = await createAssetAuditEvent(payload);
            const newId = res?.data?.data?.id || res?.data?.id || res?.data?.auditEventId;

            if (!newId) throw new Error("Missing auditEventId in response");

            setAuditEventId(Number(newId));
            setRawStartDateTime(formattedStart);
            setRawEndDateTime(formattedEnd);
            setAuditStatus("NOT_STARTED");
        } catch (err) {
            setError("Failed to create audit event.");
        } finally {
            setSavingAction(false);
        }
    };

    // Phase: Update Event End Date via PUT /asset-audit/update?id={id}
    const handleUpdateEndDate = async () => {
        if (!auditEventId || !endDate) return;

        if (new Date(endDate) < new Date(startDate)) {
            notify.error("End date cannot be earlier than start date");
            return;
        }

        const formattedEnd = formatToAuditDateTime(endDate, "11:59:59 PM");
        const formattedStart = rawStartDateTime || formatToAuditDateTime(startDate, "12:00:00 AM");

        setUpdatingDate(true);

        const updatePayload = {
            organizationId: Number(outletId) || 0,
            subOutletId: Number(subOutletId) || 0,
            assetUnitLocationId: Number(unitLocationId) || 0,
            assetSubLocationId: Number(subLocationId) || 0,
            auditStartDateTime: formattedStart,
            auditEndDateTime: formattedEnd,
            createdBy: 1,
            remarks: remarks.trim() || "Extended audit end date",
        };

        try {
            await updateAssetAuditEvent(auditEventId, updatePayload);
            setRawEndDateTime(formattedEnd);
        } catch (err) {
        } finally {
            setUpdatingDate(false);
        }
    };

    // Status Lifecycle Transition
    const handleStatusTransition = async (nextStatus) => {
        if (!auditEventId) return;

        if (nextStatus === "STARTED" && isAuditExpired) {
            notify.error("Cannot start or resume an expired audit. Please extend the end date first.");
            return;
        }

        setSavingAction(true);
        try {
            await updateAssetAuditStatus(auditEventId, {
                status: nextStatus,
                remarks: `Audit status set to ${nextStatus}`,
                updatedBy: 1,
            });

            setAuditStatus(nextStatus);

            if (nextStatus === "STARTED") {
                fetchLatestReport(auditEventId);
            } else if (nextStatus === "PAUSED") {
            } else if (nextStatus === "COMPLETED" || nextStatus === "CANCELLED") {
                navigate("/assets/asset-audit-event");
            }
        } catch (err) {
            notify.error(`Failed to transition status to ${nextStatus}.`);
        } finally {
            setSavingAction(false);
        }
    };

    const isFormLocked = auditStatus !== "UNCREATED";
    const canEditEndDate = !isTerminalState;

    return (
        <Container>
            <div className="mx-auto pt-2 pb-6 space-y-4">
                {/* Header */}
                <PageHeader
                    title={
                        auditEventId
                            ? `Audit Event - ${eventCode || `EVT-${String(auditEventId).padStart(4, "0")}`}`
                            : "Create Audit Event"
                    }
                    description="Schedule the event, start scanning, and record physical asset verification."
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate("/assets/asset-audit-event")}
                            className="h-10 inline-flex items-center gap-1.5 px-3.5 text-xs font-semibold text-gray-700 bg-white border border-[#C3C6D1] hover:bg-gray-50 rounded-xl transition cursor-pointer"
                        >
                            <ArrowLeft size={15} />
                            <span>Back to Events</span>
                        </button>
                    }
                />

                <PageErrorAlert error={error} onRetry={() => setError(null)} />

                {/* Expired Window Warning */}
                {isAuditExpired && !isTerminalState && auditStatus !== "UNCREATED" && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-amber-900">Audit Window Expired</h4>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    The scheduled end date has passed. You cannot start or resume scanning until you extend the end date.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => endDateInputRef.current?.focus()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer"
                        >
                            <CalendarClock size={14} />
                            <span>Edit End Date</span>
                        </button>
                    </div>
                )}

                {/* 1. Cascading Setup Form */}
                <div className="bg-white rounded-2xl border border-[#E7EAF0] p-4 sm:p-5 shadow-2xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
                        {/* Unit */}
                        <div className="lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                name="outletId"
                                value={outletId}
                                disabled={isFormLocked || !showUnitDropdown || orgScopeLoading}
                                onChange={(e) => {
                                    setOutletId(e.target.value);
                                    setSubOutletId("");
                                    setUnitLocationId("");
                                    setSubLocationId("");
                                }}
                                options={outletOptions}
                                placeholder="Select Unit *"
                            />
                        </div>

                        {/* Sub Unit */}
                        <div className="lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Sub Unit</label>
                            <SearchableSelect
                                name="subOutletId"
                                value={subOutletId}
                                disabled={isFormLocked || !outletId}
                                onChange={(e) => {
                                    setSubOutletId(e.target.value);
                                    setSubLocationId("");
                                }}
                                options={subOutlets.map((so) => ({
                                    value: String(so.id),
                                    label: so.subOutletName || so.name || `Sub Unit #${so.id}`,
                                }))}
                                placeholder="All Sub Units"
                            />
                        </div>

                        {/* Location */}
                        <div className="lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Location</label>
                            <SearchableSelect
                                name="unitLocationId"
                                value={unitLocationId}
                                disabled={isFormLocked || !outletId || loadingLocations}
                                onChange={(e) => setUnitLocationId(e.target.value)}
                                options={unitLocations.map((loc) => ({
                                    value: String(loc.id),
                                    label: loc.locationName || `Location #${loc.id}`,
                                }))}
                                placeholder={loadingLocations ? "Loading..." : "All Locations"}
                            />
                        </div>

                        {/* Start Date */}
                        <div className="lg:col-span-3">
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                disabled={isFormLocked}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs text-gray-800 outline-none focus:border-[#084E92] disabled:bg-gray-100 disabled:text-gray-400"
                            />
                        </div>

                        {/* End Date */}
                        <div className="lg:col-span-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-gray-700">
                                    End Date <span className="text-red-500">*</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    ref={endDateInputRef}
                                    type="date"
                                    min={startDate}
                                    disabled={!canEditEndDate}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full h-10 px-3 bg-white border rounded-xl text-xs outline-none transition ${isAuditExpired
                                        ? "border-amber-400 focus:border-amber-500 bg-amber-50/30 text-amber-900"
                                        : "border-[#C3C6D1] focus:border-[#084E92] text-gray-800"
                                        } disabled:bg-gray-100 disabled:text-gray-400`}
                                />
                                {auditEventId && canEditEndDate && (
                                    <button
                                        type="button"
                                        title="Save New End Date"
                                        disabled={updatingDate || !endDate}
                                        onClick={handleUpdateEndDate}
                                        className="h-10 px-3 bg-[#084E92] hover:bg-[#073c6f] text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition cursor-pointer"
                                    >
                                        {updatingDate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="lg:col-span-6">
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Remarks</label>
                            <input
                                type="text"
                                disabled={isFormLocked && isTerminalState}
                                placeholder="Audit description or remarks..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-[#C3C6D1] rounded-xl text-xs text-gray-800 outline-none focus:border-[#084E92] disabled:bg-gray-100 disabled:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Action State Buttons */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500">Status:</span>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${auditStatus === "CANCELLED"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : auditStatus === "COMPLETED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : auditStatus === "PAUSED"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-blue-50 text-[#084E92] border-blue-200"
                                    }`}
                            >
                                {auditStatus}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* State 1: UNCREATED */}
                            {auditStatus === "UNCREATED" && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/assets/asset-audit-event")}
                                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingAction || !outletId || !startDate || !endDate}
                                        onClick={handleCreateEvent}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
                                    >
                                        {savingAction ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        <span>Create</span>
                                    </button>
                                </>
                            )}

                            {/* State 2: NOT_STARTED */}
                            {auditStatus === "NOT_STARTED" && (
                                <>
                                    <button
                                        type="button"
                                        disabled={savingAction}
                                        onClick={() => handleStatusTransition("CANCELLED")}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                                    >
                                        <Ban size={14} />
                                        <span>Cancel</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={savingAction || isAuditExpired}
                                        onClick={() => handleStatusTransition("STARTED")}
                                        title={isAuditExpired ? "Extend end date first" : "Start Audit"}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-40"
                                    >
                                        {savingAction ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                        <span>Start</span>
                                    </button>
                                </>
                            )}

                            {/* State 3: STARTED */}
                            {auditStatus === "STARTED" && (
                                <>
                                    <button
                                        type="button"
                                        disabled={savingAction}
                                        onClick={() => handleStatusTransition("PAUSED")}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                                    >
                                        <Pause size={14} />
                                        <span>Pause</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingAction}
                                        onClick={() => handleStatusTransition("COMPLETED")}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Complete</span>
                                    </button>
                                </>
                            )}

                            {/* State 4: PAUSED */}
                            {auditStatus === "PAUSED" && (
                                <>
                                    <button
                                        type="button"
                                        disabled={savingAction || isAuditExpired}
                                        onClick={() => handleStatusTransition("STARTED")}
                                        title={isAuditExpired ? "Extend end date first" : "Resume Audit"}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#084E92] hover:bg-[#00376C] text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-40"
                                    >
                                        <Play size={14} />
                                        <span>Resume</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingAction}
                                        onClick={() => handleStatusTransition("COMPLETED")}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Complete</span>
                                    </button>
                                </>
                            )}

                            {/* State 5: COMPLETED or CANCELLED */}
                            {isTerminalState && (
                                <button
                                    type="button"
                                    onClick={() => navigate("/assets/asset-audit-event")}
                                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                                >
                                    Back to Events
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Automated Scanner Input Field */}
                {auditStatus === "STARTED" && !isAuditExpired && (
                    <div className="bg-white rounded-2xl border border-[#E7EAF0] p-4 shadow-2xs">
                        <div className="max-w-xl mx-auto space-y-2">
                            <div className="relative">
                                <ScanLine size={16} className="absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    ref={gunInputRef}
                                    type="text"
                                    autoFocus
                                    value={gunInput}
                                    disabled={isScanning}
                                    onChange={onInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleProcessScan(e.currentTarget.value);
                                        }
                                    }}
                                    placeholder="Awaiting QR UUID from scanner app or barcode gun..."
                                    className="w-full h-11 pl-10 pr-10 text-xs bg-gray-50/70 border border-[#C3C6D1] rounded-xl focus:bg-white focus:border-[#084E92] outline-none font-mono transition shadow-2xs"
                                />
                                {isScanning && (
                                    <Loader2 size={16} className="absolute right-3.5 top-3 text-[#084E92] animate-spin" />
                                )}
                            </div>

                            {scanMessage && (
                                <p className="text-[11px] font-medium text-center text-gray-500 animate-pulse">
                                    {scanMessage}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Aggregated Assets & Scanned Sub-details Table */}
                {auditStatus !== "UNCREATED" && (
                    <div className="bg-white rounded-2xl border border-[#E7EAF0] overflow-hidden shadow-2xs">
                        <div className="px-4 py-3 bg-[#EFF4FF] border-b border-[#E2E8F0] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#00376C]">
                                    Verified Assets ({assetDetails.length})
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-500">
                               Total Items: {totalItemsScanned}
                            </span>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 font-semibold sticky top-0 border-b border-gray-200 z-10">
                                    <tr>
                                        <th className="px-3 py-2.5 w-16 text-center">Sr No</th>
                                        <th className="px-3 py-2.5">Asset / Item Name</th>
                                        <th className="px-3 py-2.5">Category</th>
                                        <th className="px-3 py-2.5 w-32 text-center">Scanned Qty</th>
                                        <th className="px-3 py-2.5 w-36">Last Scanned Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {assetDetails.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-400">
                                                No assets scanned yet. Scan an asset QR with your external app or scanner gun.
                                            </td>
                                        </tr>
                                    ) : (
                                        assetDetails.map((asset, idx) => {
                                            const isExpanded = expandedAssetIds.has(asset.id || asset.assetId);
                                            const subDetails = asset.subDetails || [];

                                            return (
                                                <React.Fragment key={asset.id || `${asset.assetId}-${idx}`}>
                                                    <tr className="hover:bg-blue-50/40 transition">
                                                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleAssetExpansion(asset.id || asset.assetId)}
                                                                className="font-semibold text-gray-800 text-left hover:text-[#084E92] hover:underline cursor-pointer flex items-center gap-1.5 transition"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown size={14} className="text-[#084E92] shrink-0" />
                                                                ) : (
                                                                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                                                                )}
                                                                <span>{asset.itemName}</span>
                                                                {asset.assetCode && (
                                                                    <span className="text-[10px] text-gray-400 font-mono font-normal">
                                                                        ({asset.assetCode})
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2.5 font-medium text-gray-600 truncate" title={asset.categoryName}>
                                                            {asset.categoryName || "-"}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className="inline-flex items-center justify-center font-bold text-xs bg-blue-50 text-[#084E92] px-2.5 py-0.5 rounded-full border border-blue-200">
                                                                {asset.totalScannedQty || subDetails.length || 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                                                            {asset.lastScanDateTime || asset.firstScanDateTime || "-"}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Sub-details Row */}
                                                    {isExpanded && (
                                                        <tr className="bg-gray-50/70 border-b border-gray-100">
                                                            <td colSpan={5} className="px-6 py-3">
                                                                <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2 shadow-2xs">
                                                                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                                                                        <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1.5">
                                                                            <Barcode size={13} className="text-[#084E92]" />
                                                                            Verified Scan Instances ({subDetails.length})
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400">
                                                                            Brand: {asset.brandName || "N/A"} {asset.modelNumber ? `| Model: ${asset.modelNumber}` : ""}
                                                                        </span>
                                                                    </div>

                                                                    {subDetails.length === 0 ? (
                                                                        <p className="text-[11px] text-gray-400 py-1 italic">
                                                                            No instance details recorded.
                                                                        </p>
                                                                    ) : (
                                                                        <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                                                            {subDetails.map((sub, sIdx) => (
                                                                                <div
                                                                                    key={sub.id || sub.uuid || sIdx}
                                                                                    className="py-1.5 flex items-center justify-between text-xs hover:bg-gray-50 px-1 rounded transition"
                                                                                >
                                                                                    <div className="flex items-center gap-2 font-mono text-gray-700">
                                                                                        <span className="text-gray-400 text-[10px]">{sIdx + 1}.</span>
                                                                                        <span className="truncate max-w-[280px]" title={sub.uuid}>
                                                                                            {sub.uuid}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="text-gray-500 text-[11px]">
                                                                                            {sub.scanDateTime || "-"}
                                                                                        </span>
                                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                                            <CheckCircle2 size={10} />
                                                                                            Qty: {sub.qty || 1}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            <div ref={tableBottomRef} />
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
};
export default CreateAuditEvent;
