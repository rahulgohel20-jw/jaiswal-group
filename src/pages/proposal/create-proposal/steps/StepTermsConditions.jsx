import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  FileDown,
  Eye,
  Download,
  ArrowLeft,
  Save,
  Send,
  Loader2,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import { AddTermModal } from '../modals/AddTermModal';
import {
  uploadProposalAttachment,
  getProposalAttachments,
  deleteProposalAttachment,
  getTermsLookup,
  getTermsByProposalId,
  copyDefaultTerms,
  saveTermsBatch,
  deleteTerm,
  downloadProposalQuotationPdf,
  downloadExecutiveCostingPdf,
} from '@/services/apiServices';
import { toast } from 'sonner';

export const StepTermsConditions = ({
  proposalId,
  status = 'DRAFT',
  isPendingApproval = false,
  canApprove = false,
  terms = [],
  attachments = [],
  specialNotes = '',
  onUpdateTerms,
  onUpdateAttachments,
  onUpdateSpecialNotes,
  onSaveTerms,
  onSaveDraft,
  onSubmitForApproval,
  onUpdateProposal,
  onUpdateAndApprove,
  onPrevious,
  saving = false,
  submitting = false,
  updating = false,
  approving = false,
}) => {
  const [isAddTermOpen, setIsAddTermOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState('');
  const fileInputRef = useRef(null);

  const mapServerAttachment = useCallback((item) => {
    const rawName = item.fileName || item.originalFileName || item.name || 'Attachment';
    const ext = rawName.split('.').pop()?.toLowerCase() || item.fileType || 'file';

    let formattedSize = item.fileSize ? `${item.fileSize}` : '';
    if (typeof item.fileSize === 'number') {
      if (item.fileSize >= 1024 * 1024) {
        formattedSize = `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB`;
      } else if (item.fileSize >= 1024) {
        formattedSize = `${(item.fileSize / 1024).toFixed(0)} KB`;
      } else {
        formattedSize = `${item.fileSize} B`;
      }
    }

    let formattedDate = 'Recently';
    if (item.createdAt || item.uploadedAt) {
      try {
        const d = new Date(item.createdAt || item.uploadedAt);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {}
    }

    return {
      id: item.id,
      fileName: rawName,
      fileSize: formattedSize || 'Document',
      type: ext,
      uploadedAt: formattedDate,
      url: item.filePath || item.fileUrl || item.url || null,
    };
  }, []);

  // Fetch Attachments from Server via GET /api/proposal-attachments/proposals/{proposalId}
  const fetchAttachments = useCallback(async () => {
    if (!proposalId) return;
    setLoadingAttachments(true);
    try {
      const res = await getProposalAttachments(proposalId);
      const raw = res?.data?.data ?? res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.attachments)
        ? raw.attachments
        : [];
      if (Array.isArray(list)) {
        onUpdateAttachments(list.map(mapServerAttachment));
      }
    } catch (err) {
      console.warn('Failed to load proposal attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  }, [proposalId, onUpdateAttachments, mapServerAttachment]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Fetch Terms from Server (or copy defaults / lookup)
  const fetchTerms = useCallback(async () => {
    if (terms && terms.length > 0) return;

    setLoadingTerms(true);
    try {
      if (proposalId) {
        // 1. Try to fetch existing terms for this proposal
        const res = await getTermsByProposalId(proposalId);
        const raw = res?.data?.data ?? res?.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.content)
          ? raw.content
          : [];

        if (list.length > 0) {
          const mapped = list.map((item, idx) => ({
            id: item.id || idx + 1,
            termTitle: item.termTitle || item.term || item.title || `Term ${idx + 1}`,
            termDescription:
              item.termDescription || item.details || item.description || '',
            term: item.termTitle || item.term || item.title || `Term ${idx + 1}`,
            details:
              item.termDescription || item.details || item.description || '',
            isMandatory: item.isMandatory !== undefined ? Boolean(item.isMandatory) : true,
            sequence: item.sequence || idx + 1,
            termMasterId: item.termMasterId || 0,
            proposalId: Number(proposalId),
            userId: item.userId || 0,
          }));
          onUpdateTerms(mapped);
          return;
        }

        // 2. If no terms yet for this proposal, call copyDefaultTerms
        try {
          const copyRes = await copyDefaultTerms(proposalId);
          const copyRaw = copyRes?.data?.data ?? copyRes?.data;
          const copyList = Array.isArray(copyRaw)
            ? copyRaw
            : Array.isArray(copyRaw?.content)
            ? copyRaw.content
            : [];
          if (copyList.length > 0) {
            const mapped = copyList.map((item, idx) => ({
              id: item.id || idx + 1,
              termTitle: item.termTitle || item.term || item.title || `Term ${idx + 1}`,
              termDescription:
                item.termDescription || item.details || item.description || '',
              term: item.termTitle || item.term || item.title || `Term ${idx + 1}`,
              details:
                item.termDescription || item.details || item.description || '',
              isMandatory: item.isMandatory !== undefined ? Boolean(item.isMandatory) : true,
              sequence: item.sequence || idx + 1,
              termMasterId: item.termMasterId || 0,
              proposalId: Number(proposalId),
              userId: item.userId || 0,
            }));
            onUpdateTerms(mapped);
            return;
          }
        } catch (copyErr) {
          console.warn('copyDefaultTerms fallback to lookup:', copyErr);
        }
      }

      // 3. Fallback to standard terms lookup
      const res = await getTermsLookup();
      const raw = res?.data?.data ?? res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.content)
        ? raw.content
        : [];

      if (list.length > 0) {
        const mapped = list.map((item, idx) => ({
          id: item.id || idx + 1,
          termTitle: item.term || item.title || item.name || item.termName || `Term ${idx + 1}`,
          termDescription:
            item.details || item.description || item.clauseDetails || item.content || '',
          term: item.term || item.title || item.name || item.termName || `Term ${idx + 1}`,
          details:
            item.details || item.description || item.clauseDetails || item.content || '',
          isMandatory: true,
          sequence: idx + 1,
          termMasterId: item.id || 0,
          proposalId: Number(proposalId || 0),
          userId: 0,
        }));
        onUpdateTerms(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch terms:', err);
    } finally {
      setLoadingTerms(false);
    }
  }, [proposalId, terms, onUpdateTerms]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  // Term management (pure local state edits - no modal or field save API call)
  const handleTermFieldChange = (id, field, value) => {
    const updated = terms.map((t) => {
      if (t.id !== id) return t;
      if (field === 'term' || field === 'termTitle') {
        return { ...t, term: value, termTitle: value };
      }
      if (field === 'details' || field === 'termDescription') {
        return { ...t, details: value, termDescription: value };
      }
      return { ...t, [field]: value };
    });
    onUpdateTerms(updated);
  };

  // Add term from modal into local state only
  const handleAddTerm = (newTerm) => {
    const nextSeq = terms.length + 1;
    onUpdateTerms([
      ...terms,
      {
        ...newTerm,
        sequence: nextSeq,
        proposalId: Number(proposalId || 0),
      },
    ]);
  };

  // Delete term (calls deleteTerm if term has DB id, and removes locally)
  const handleDeleteTerm = async (id) => {
    if (proposalId && typeof id === 'number' && id > 0 && id < 1000000000000) {
      try {
        await deleteTerm(id);
      } catch (err) {
        console.warn('Failed to delete term from server:', err);
      }
    }
    const updated = terms
      .filter((t) => t.id !== id)
      .map((t, idx) => ({ ...t, sequence: idx + 1 }));
    onUpdateTerms(updated);
  };

  // Attachment upload via POST /api/proposal-attachments/upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    setUploading(true);
    try {
      if (proposalId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('proposalId', proposalId);
        await uploadProposalAttachment(formData);
        toast.success('Document uploaded successfully.');
        await fetchAttachments();
      } else {
        const newAttachment = {
          id: Date.now(),
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: file.name.split('.').pop()?.toLowerCase() || 'file',
          uploadedAt: 'Today',
          url: URL.createObjectURL(file),
          rawFile: file,
        };
        onUpdateAttachments([...attachments, newAttachment]);
        toast.success('Document added.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Attachment delete via DELETE /api/proposal-attachments/delete/{attachmentId}
  const handleDeleteAttachment = async (id) => {
    setDeletingAttachmentId(id);
    try {
      if (proposalId && typeof id === 'number' && id < 1000000000000) {
        await deleteProposalAttachment(id);
        toast.success('Document deleted successfully.');
        await fetchAttachments();
      } else {
        onUpdateAttachments(attachments.filter((a) => a.id !== id));
        toast.success('Document removed.');
      }
    } catch (err) {
      console.error('Attachment deletion error:', err);
      toast.error('Failed to delete document from server.');
      onUpdateAttachments(attachments.filter((a) => a.id !== id));
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleViewAttachment = (file) => {
    if (file.url) {
      window.open(file.url, '_blank');
    } else {
      toast.info(`Attachment: ${file.fileName} (${file.fileSize})`);
    }
  };

  const handleDownloadAttachment = async (file) => {
    if (file.rawFile) {
      const url = window.URL.createObjectURL(file.rawFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloading ${file.fileName}...`);
      return;
    }

    const downloadUrl = file.url || file.filePath || file.fileUrl;
    if (!downloadUrl) {
      toast.info(`No download link available for ${file.fileName}`);
      return;
    }

    try {
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.fileName || 'document';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
        toast.success(`Downloading ${file.fileName}...`);
        return;
      }
    } catch (e) {
      console.warn('Direct blob fetch failed, falling back to anchor download:', e);
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.fileName || 'download');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${file.fileName}...`);
  };

  // Document downloads
  const handleDownloadQuotation = async () => {
    setDownloadingDoc('quotation');
    try {
      if (proposalId) {
        const res = await downloadProposalQuotationPdf(proposalId);
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Proposal_Quotation_${proposalId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Quotation PDF generated successfully.');
      } else {
        toast.info('Please save the proposal before downloading generated documents.');
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.info('Document generation ready on server.');
    } finally {
      setDownloadingDoc('');
    }
  };

  const handleDownloadExecutiveCosting = async () => {
    setDownloadingDoc('costing');
    try {
      if (proposalId) {
        const res = await downloadExecutiveCostingPdf(proposalId);
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Internal_Costing_${proposalId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Internal Costing Sheet generated successfully.');
      } else {
        toast.info('Please save the proposal before downloading generated documents.');
      }
    } catch (err) {
      console.error('Failed to generate Costing PDF:', err);
      toast.info('Document generation ready on server.');
    } finally {
      setDownloadingDoc('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Title on left, Action Button on right */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Terms &amp; Conditions</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddTermOpen(true)}
            className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            Add Term
          </button>
        </div>
      </div>

      {/* 2. Terms Table Card */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl overflow-hidden shadow-xs">
        {/* Terms Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-16">Sr. No.</th>
                <th className="py-3 px-4 w-52">Term</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 w-20 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loadingTerms ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-xs">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-[#084E92]" />
                      Loading terms...
                    </div>
                  </td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-xs">
                    No custom terms configured. Click &ldquo;Add Term&rdquo; to add contractual clauses.
                  </td>
                </tr>
              ) : (
                terms.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-3.5 text-gray-400 font-bold">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={t.termTitle ?? t.term ?? ''}
                        onChange={(e) => handleTermFieldChange(t.id, 'termTitle', e.target.value)}
                        placeholder="Term Title"
                        className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#084E92]"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={t.termDescription ?? t.details ?? ''}
                        onChange={(e) => handleTermFieldChange(t.id, 'termDescription', e.target.value)}
                        placeholder="Term Details"
                        className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:border-[#084E92]"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title="Delete term"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Lower Split Grid: Attachments & Generate Documents / Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Attachments Card */}
        <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Attachments</h3>
              </div>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                {attachments.length} Files
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
            />

            {/* Drag & Drop Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-blue-50/20 hover:bg-blue-50/40 transition cursor-pointer text-center group"
            >
              <div className="w-11 h-11 rounded-full bg-blue-50 text-[#084E92] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <UploadCloud size={20} />
                )}
              </div>
              <span className="text-xs font-bold text-gray-800">
                {uploading ? 'Uploading document...' : 'Click to upload or drag & drop'}
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5">
                PDF, DOCX, XLSX or PNG (Max size: 25MB)
              </span>
            </div>

            {/* Uploaded Documents List */}
            {loadingAttachments ? (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-xs">
                <Loader2 size={16} className="animate-spin text-[#084E92]" />
                Loading attachments...
              </div>
            ) : attachments.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Uploaded Documents ({attachments.length})
                </span>
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-1 bg-red-50 text-red-600 font-bold text-[10px] rounded uppercase border border-red-200">
                        {file.type || 'DOC'}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-[260px]">
                          {file.fileName}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {file.fileSize} • {file.uploadedAt}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(file)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                        title="View file"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(file)}
                        className="p-1.5 text-gray-400 hover:text-[#084E92] rounded-lg hover:bg-blue-50 transition cursor-pointer"
                        title="Download file"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(file.id)}
                        disabled={deletingAttachmentId === file.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                        title="Delete file"
                      >
                        {deletingAttachmentId === file.id ? (
                          <Loader2 size={13} className="animate-spin text-red-500" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Generate Documents & Special Notes */}
        <div className="space-y-5 flex flex-col justify-between">
          {/* Top: Generate Documents */}
          <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Generate Documents</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Document 1: Client Proposal PDF */}
              <div className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl bg-gray-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#084E92] flex items-center justify-center shrink-0">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Client Proposal PDF</div>
                    <div className="text-[11px] text-gray-400">Branded document ready for client presentation</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQuotation}
                  disabled={downloadingDoc === 'quotation'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {downloadingDoc === 'quotation' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <FileDown size={13} />
                  )}
                  Generate
                </button>
              </div>

              {/* Document 2: Internal Costing Sheet */}
              <div className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl bg-gray-50/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Internal Costing Sheet</div>
                    <div className="text-[11px] text-gray-400">Margin analysis and operational breakdown</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExecutiveCosting}
                  disabled={downloadingDoc === 'costing'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#084E92] hover:bg-[#073e77] text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {downloadingDoc === 'costing' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <FileDown size={13} />
                  )}
                  Generate
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: Special Notes Card */}
          <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 shadow-xs space-y-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Special Notes</h3>
              </div>
            </div>
            <textarea
              rows={3}
              value={specialNotes}
              onChange={(e) => onUpdateSpecialNotes(e.target.value)}
              placeholder="Enter any additional notes or stipulations related to this proposal..."
              className="w-full p-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/15 resize-none text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          Previous
        </button>

        <div className="flex items-center gap-3">
          {(() => {
            const statusStr = String(status || '').toUpperCase().trim();
            const isPending =
              isPendingApproval ||
              statusStr === 'PENDING_APPROVAL' ||
              statusStr === 'PENDING APPROVAL' ||
              statusStr === 'SENT_FOR_APPROVAL' ||
              statusStr === 'SENT FOR APPROVAL' ||
              (Boolean(statusStr) && statusStr !== 'DRAFT');

            if (isPending) {
              return (
                <>
                  <button
                    type="button"
                    onClick={onUpdateProposal}
                    disabled={saving || submitting || updating || approving}
                    className={
                      canApprove
                        ? "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
                        : "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
                    }
                  >
                    {updating || saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </button>

                  {canApprove && (
                    <button
                      type="button"
                      onClick={onUpdateAndApprove}
                      disabled={saving || submitting || updating || approving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {approving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Save & Approve
                    </button>
                  )}
                </>
              );
            }

            return (
              <>
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={saving || submitting || updating || approving}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#084E92] text-xs font-semibold text-[#084E92] bg-white hover:bg-blue-50/60 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={onSubmitForApproval}
                  disabled={saving || submitting || updating || approving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#084E92] hover:bg-[#073e77] transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send for Approval
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Add Term Modal */}
      <AddTermModal
        isOpen={isAddTermOpen}
        onClose={() => setIsAddTermOpen(false)}
        onAddTerm={handleAddTerm}
      />
    </div>
  );
};

export default StepTermsConditions;
