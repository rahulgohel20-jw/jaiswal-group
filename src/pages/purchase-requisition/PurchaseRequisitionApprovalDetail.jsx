import React from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import ApprovalView from "./utils/ApprovalView";
import { usePurchaseRequisitions } from "./utils/usePurchaseRequisitions";
import { getUserIdFromToken } from "@/utils/auth";
import { getUsernameFromToken } from "../../utils/auth";

export default function PurchaseRequisitionApprovalDetail({ mode = "approve" }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { saveApprovalProgress, approveWithChanges, reject } =
    usePurchaseRequisitions();

  const requisition = location.state?.requisition;

  const backToList = () => navigate("/approve-purchase-requisition/list");

  if (!requisition) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-[#667085] mb-4">
          We couldn't find requisition{" "}
          <span className="font-semibold">#{id}</span> — it may need to be
          reloaded from the list.
        </p>
        <button
          onClick={backToList}
          className="h-10 px-4 rounded-xl bg-[#2952E3] text-white text-sm font-semibold"
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
      onBack={() => navigate(-1)}
      onSave={handleSave}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}