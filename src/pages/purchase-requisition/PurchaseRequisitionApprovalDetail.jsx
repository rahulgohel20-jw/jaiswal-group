import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import ApprovalView from "./utils/ApprovalView";
import { usePurchaseRequisitions } from "./utils/usePurchaseRequisitions";
import { getUserIdFromToken } from "@/utils/auth";
import { getUsernameFromToken } from "../../utils/auth";
import { usePagePermissions } from "@/utils/permissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Loader2 } from "lucide-react";

export default function PurchaseRequisitionApprovalDetail({ mode = "approve" }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { canEdit, canView } = usePagePermissions('Approve Purchase Requisition');

  const { saveApprovalProgress, approveWithChanges, reject, fetchById } =
    usePurchaseRequisitions();

  const [requisition, setRequisition] = useState(location.state?.requisition || null);
  const [loading, setLoading] = useState(!location.state?.requisition && !!id);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requisition && id) {
      setLoading(true);
      setError(null);
      fetchById(id)
        .then((data) => {
          if (data) {
            setRequisition(data);
          } else {
            setError(`We couldn't find requisition #${id}`);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch requisition", err);
          setError(err?.message || `Failed to load requisition #${id}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, requisition, fetchById]);

  const backToList = () => navigate("/approve-purchase-requisition/list");

  if (!canView) {
    return <AccessDenied pageTitle="Approve Purchase Requisition" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#084E92]" />
        <p className="text-sm font-medium text-slate-500">Loading requisition details...</p>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-[#667085] mb-4">
          {error || (
            <>
              We couldn't find requisition <span className="font-semibold">#{id}</span> — it may need to be reloaded from the list.
            </>
          )}
        </p>
        <button
          onClick={backToList}
          className="h-10 px-4 rounded-xl bg-[#084E92] text-white text-sm font-semibold hover:bg-[#073e77] transition cursor-pointer"
        >
          Back to approvals
        </button>
      </div>
    );
  }

  // ---- Handler: Save → IN_PROGRESS ----
  const handleSave = async ({ details, remarks }) => {
    await saveApprovalProgress(requisition.id, {
      actionBy: getUsernameFromToken(),
      userId: getUserIdFromToken(),
      outletId: requisition.outletId,
      outletName: requisition.outlet,
      outletShortCode: requisition.code ?? "",
      subOutletId: requisition.subOutletId,
      subOutletName: requisition.subOutletName,
      prDate: requisition.date,
      prRequiredDate: requisition.requiredDate,
      remarks,
      details,
    });
    navigate("/approve-purchase-requisition/list");
  };

  // ---- Handler: Save & Approve → APPROVED ----
  const handleApprove = async ({ details, remarks }) => {
    await approveWithChanges(requisition.id, {
      actionBy: getUsernameFromToken(),
      userId: getUserIdFromToken(),
      outletId: requisition.outletId,
      outletName: requisition.outlet,
      outletShortCode: requisition.code ?? "",
      subOutletId: requisition.subOutletId,
      subOutletName: requisition.subOutletName,
      prDate: requisition.date,
      prRequiredDate: requisition.requiredDate,
      remarks,
      details,
    });
    navigate("/approve-purchase-requisition/list");
  };

  // ---- Handler: Reject → REJECTED (status-only, no item changes) ----
  const handleReject = async ({ remarks }) => {
    await reject(requisition.id, getUsernameFromToken(), getUserIdFromToken(), remarks);
    navigate("/approve-purchase-requisition/list");
  };

  return (
    <ApprovalView
      requisition={requisition}
      mode={mode}
      canEdit={canEdit}
      onBack={() => navigate(-1)}
      onSave={handleSave}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}