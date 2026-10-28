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
    Camera,
    CameraOff,
    SwitchCamera,
    Flashlight,
    Keyboard,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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

    // Live Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraDevices, setCameraDevices] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [cameraInitializing, setCameraInitializing] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    // Hardware & Scanner Refs
    const isProcessingRef = useRef(false);
    const lastScannedCodeRef = useRef("");
    const lastScanTimestampRef = useRef(0);
    const debounceTimerRef = useRef(null);
    const tableBottomRef = useRef(null);
    const gunInputRef = useRef(null);
    const endDateInputRef = useRef(null);

    // Camera Lifecycle Refs
    const html5QrCodeRef = useRef(null);
    const isStartingCameraRef = useRef(false);
    const isStoppingCameraRef = useRef(false);
    const activeTrackRef = useRef(null);
    const cameraSessionIdRef = useRef(0);

    const playBeep = () => {
        try {
            const AudioContextClass = window.AudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
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
        if (auditStatus === "STARTED" && !isAuditExpired && !isCameraActive) {
            gunInputRef.current?.focus();
        }
    }, [auditStatus, isAuditExpired, isCameraActive]);

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

    // Unified QR & Barcode Processing Handler (Invoked by Camera, Gun & Input)
    const handleProcessScan = useCallback(async (rawUuid) => {
        const trimmedUuid = (rawUuid || "").trim();
        if (!trimmedUuid || isProcessingRef.current || !auditEventId || auditStatus !== "STARTED") {
            return;
        }

        if (isAuditExpired) {
            notify.error("Audit window has elapsed. Extend the end date before scanning.");
            return;
        }

        // Prevent rapid repeated scan spam on identical code (2.5s cooldown threshold)
        const now = Date.now();
        if (trimmedUuid === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 2500) {
            return;
        }

        // Cancel any pending text debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        isProcessingRef.current = true;
        setIsScanning(true);
        lastScannedCodeRef.current = trimmedUuid;
        lastScanTimestampRef.current = now;
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
                if (!isCameraActive) {
                    gunInputRef.current?.focus();
                }
            }, 450);
        }
    }, [auditEventId, auditStatus, outletId, subOutletId, unitLocationId, subLocationId, isAuditExpired, isCameraActive, fetchLatestReport]);

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

    // Stop Camera Stream Utility (Explicitly releases tracks & resets torch)
    const stopCamera = useCallback(async () => {
        if (isStoppingCameraRef.current) return;
        isStoppingCameraRef.current = true;

        try {
            // 1. Force hardware torch off before killing tracks
            if (activeTrackRef.current) {
                try {
                    await activeTrackRef.current.applyConstraints({
                        advanced: [{ torch: false }],
                    });
                } catch {
                    // Ignored if track is already closing or unsupported
                }
            }

            // 2. Stop html5QrCode scanner instance
            if (html5QrCodeRef.current) {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                await html5QrCodeRef.current.clear();
            }

            // 3. Explicitly kill video track at browser MediaStreamTrack level
            if (activeTrackRef.current) {
                activeTrackRef.current.stop();
                activeTrackRef.current = null;
            }
        } catch {
            // Handled cleanup error
        } finally {
            html5QrCodeRef.current = null;
            isStartingCameraRef.current = false;
            isStoppingCameraRef.current = false;
            setIsTorchOn(false);
            setTorchAvailable(false);
            setCameraInitializing(false);
        }
    }, []);

   // Start Camera Stream Utility
    const startCamera = useCallback(async (cameraId = null) => {
        if (isStartingCameraRef.current || isTerminalState || auditStatus !== "STARTED" || isAuditExpired) {
            return;
        }

        isStartingCameraRef.current = true;
        setCameraInitializing(true);

        try {
            await stopCamera();

            // Session ID set AFTER stopCamera finishes so it doesn't self-cancel
            const currentSession = ++cameraSessionIdRef.current;

            // Give React 1 tick to ensure DOM container #asset-audit-qr-reader is rendered
            await new Promise((r) => setTimeout(r, 60));

            const container = document.getElementById("asset-audit-qr-reader");
            if (!container || currentSession !== cameraSessionIdRef.current) {
                return;
            }

            const devices = await Html5Qrcode.getCameras();
            if (Array.isArray(devices) && devices.length > 0) {
                setCameraDevices(devices);
            }

            const qrCodeScanner = new Html5Qrcode("asset-audit-qr-reader", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                ],
                verbose: false,
            });

            html5QrCodeRef.current = qrCodeScanner;

            const cameraConfig = cameraId
                ? { deviceId: { exact: cameraId } }
                : { facingMode: "environment" };

            const config = {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxEdge = Math.floor(minEdge * 0.72);
                    return { width: qrboxEdge, height: qrboxEdge };
                },
                aspectRatio: 1.0,
            };

            await qrCodeScanner.start(
                cameraConfig,
                config,
                (decodedText) => {
                    handleProcessScan(decodedText);
                },
                () => {}
            );

            // Abort if camera mode was closed during start()
            if (currentSession !== cameraSessionIdRef.current) {
                await stopCamera();
                return;
            }

            // Cache active video track for explicit torch & shutdown control
            try {
                const capabilities = qrCodeScanner.getRunningTrackCapabilities();
                if (capabilities && capabilities.torch) {
                    setTorchAvailable(true);
                }
                const videoEl = document.querySelector("#asset-audit-qr-reader video");
                if (videoEl && videoEl.srcObject) {
                    const tracks = videoEl.srcObject.getVideoTracks();
                    if (tracks && tracks.length > 0) {
                        activeTrackRef.current = tracks[0];
                    }
                }
            } catch {
                setTorchAvailable(false);
            }
        } catch (err) {
            notify.error("Unable to access camera. Check browser permissions or use scanner gun.");
            setIsCameraActive(false);
            await stopCamera();
        } finally {
            isStartingCameraRef.current = false;
            setCameraInitializing(false);
        }
    }, [isTerminalState, auditStatus, isAuditExpired, stopCamera, handleProcessScan]);

    // Handle toggling the torch / flashlight
    const handleToggleTorch = async () => {
        if (!html5QrCodeRef.current || !torchAvailable) return;
        try {
            const nextState = !isTorchOn;
            await html5QrCodeRef.current.applyVideoConstraints({
                advanced: [{ torch: nextState }],
            });
            setIsTorchOn(nextState);
        } catch {
            notify.error("Flashlight control is not supported on this device.");
        }
    };

    // Cycle camera lens (switch front/back or next device)
    const handleSwitchCamera = async () => {
        if (cameraDevices.length <= 1) return;
        const currentIndex = cameraDevices.findIndex((d) => d.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameraDevices.length;
        const nextCameraId = cameraDevices[nextIndex].id;
        setSelectedCameraId(nextCameraId);
        await startCamera(nextCameraId);
    };

    // Handle camera active state transitions
    useEffect(() => {
        if (isCameraActive && auditStatus === "STARTED" && !isAuditExpired) {
            startCamera(selectedCameraId || null);
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isCameraActive, auditStatus, isAuditExpired, selectedCameraId, startCamera, stopCamera]);

    // Safety cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            stopCamera();
        };
    }, [stopCamera]);

    // Global KeyDown listener for hardware barcode guns and auto-focus
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

            if (!isCameraActive && document.activeElement !== gunInputRef.current) {
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
    }, [auditStatus, isAuditExpired, isCameraActive, handleProcessScan]);

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
                setIsCameraActive(false);
                await stopCamera();
            } else if (nextStatus === "COMPLETED" || nextStatus === "CANCELLED") {
                setIsCameraActive(false);
                await stopCamera();
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
                        <div className="lg:col-span-6">
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
                        {/* <div className="lg:col-span-4">
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
                        </div> */}

                        {/* Location */}
                        <div className="lg:col-span-6">
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

                {/* 2. Automated Scanner Section: Hardware Barcode Gun + Live Web/Mobile Camera */}
                {auditStatus === "STARTED" && !isAuditExpired && (
                    <div className="bg-white rounded-2xl border border-[#E7EAF0] p-4 sm:p-5 shadow-2xs space-y-4">
                        {/* Mode Selector & Controls */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                            <div className="flex sm:items-center gap-2 sm:flex-row flex-col">
                                <span className="text-xs font-bold text-gray-800">Scan Input:</span>
                                <div className="inline-flex p-0.5 bg-gray-100 rounded-xl border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            cameraSessionIdRef.current += 1;
                                            setIsCameraActive(false);
                                            await stopCamera();
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition ${!isCameraActive
                                            ? "bg-white text-[#084E92] shadow-2xs"
                                            : "text-gray-600 hover:text-gray-900"
                                            }`}
                                    >
                                        <Keyboard size={13} className="shrink-0"/>
                                        <span>Barcode Gun / Input</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsCameraActive(true)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition ${isCameraActive
                                            ? "bg-[#084E92] text-white shadow-2xs"
                                            : "text-gray-600 hover:text-gray-900"
                                            }`}
                                    >
                                        <Camera size={13} />
                                        <span>Webcam / Mobile Camera</span>
                                    </button>
                                </div>
                            </div>

                            {/* Camera Actions (Only visible in camera mode) */}
                            {isCameraActive && (
                                <div className="flex items-center gap-2">
                                    {torchAvailable && (
                                        <button
                                            type="button"
                                            onClick={handleToggleTorch}
                                            className={`h-8 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${isTorchOn
                                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                }`}
                                        >
                                            <Flashlight size={13} className={isTorchOn ? "text-amber-600" : "text-gray-500"} />
                                            <span>{isTorchOn ? "Flash On" : "Flash"}</span>
                                        </button>
                                    )}

                                    {cameraDevices.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleSwitchCamera}
                                            className="h-8 px-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                            title="Switch Camera (Front / Rear)"
                                        >
                                            <SwitchCamera size={13} className="text-[#084E92]" />
                                            <span>Flip Lens</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            cameraSessionIdRef.current += 1;
                                            setIsCameraActive(false);
                                            await stopCamera();
                                        }}
                                        className="h-8 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                    >
                                        <CameraOff size={13} />
                                        <span>Close Feed</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Scanner Gun View */}
                        {!isCameraActive && (
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
                                        placeholder="Awaiting QR UUID from scanner gun or manual entry..."
                                        className="w-full h-11 pl-10 pr-10 text-xs bg-gray-50/70 border border-[#C3C6D1] rounded-xl focus:bg-white focus:border-[#084E92] outline-none font-mono transition shadow-2xs"
                                    />
                                    {isScanning && (
                                        <Loader2 size={16} className="absolute right-3.5 top-3 text-[#084E92] animate-spin" />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Live Camera Viewport */}
                        {isCameraActive && (
                            <div className="max-w-md mx-auto space-y-2.5">
                                <div className="relative w-full aspect-square max-h-80 mx-auto bg-black rounded-2xl overflow-hidden border-2 border-[#084E92] shadow-md flex items-center justify-center">
                                    {/* HTML5 QR Container */}
                                    <div id="asset-audit-qr-reader" className="w-full h-full object-cover" />

                                    {/* Loading State Overlay */}
                                    {cameraInitializing && (
                                        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-white z-20">
                                            <Loader2 size={24} className="animate-spin text-blue-400" />
                                            <span className="text-xs font-medium tracking-wide">Starting Camera Stream...</span>
                                        </div>
                                    )}

                                    {/* Scanning Feedback Flash */}
                                    {isScanning && (
                                        <div className="absolute inset-0 bg-emerald-500/20 border-4 border-emerald-400 z-10 animate-pulse pointer-events-none" />
                                    )}

                                    {/* Viewfinder Target Graphic */}
                                    <div className="absolute inset-10 border-2 border-dashed border-white/60 rounded-xl pointer-events-none z-10 flex flex-col justify-between p-2">
                                        <div className="flex justify-between">
                                            <span className="w-4 h-4 border-t-2 border-l-2 border-white" />
                                            <span className="w-4 h-4 border-t-2 border-r-2 border-white" />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="w-4 h-4 border-b-2 border-l-2 border-white" />
                                            <span className="w-4 h-4 border-b-2 border-r-2 border-white" />
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[11px] text-gray-500 text-center font-medium">
                                    Align the QR code within the central square. Point phone rear camera or desktop webcam.
                                </p>
                            </div>
                        )}

                        {/* Status Message */}
                        {scanMessage && (
                            <p className="text-[11px] font-semibold text-center text-[#084E92] animate-pulse">
                                {scanMessage}
                            </p>
                        )}
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
                            <span className="text-[11px] text-gray-500 font-medium">
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
                                                No assets scanned yet. Scan an asset QR with camera or Scanner gun.
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
                                                                    <span className="text-[10px] text-gray-400 font-mono font-normal sm:flex hidden">
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
                                                                                    <div className="hidden sm:flex items-center gap-2 font-mono text-gray-700">
                                                                                        <span className="text-gray-400 text-[10px]">{sIdx + 1}.</span>
                                                                                        <span className="truncate max-w-70" title={sub.uuid}>
                                                                                            {sub.uuid}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 text-gray-600 sm:hidden">
                                                                                        <span className="text-gray-400 font-mono text-[10px]">{sIdx + 1}.</span>
                                                                                        <span className="text-[11px] font-medium text-gray-600">
                                                                                            {sub.scanDateTime || "-"}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="hidden sm:inline text-gray-500 text-[11px]">
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
