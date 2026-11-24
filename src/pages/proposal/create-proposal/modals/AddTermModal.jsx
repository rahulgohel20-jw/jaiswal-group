import { useState } from 'react';
import { X, Plus } from 'lucide-react';

export const AddTermModal = ({ isOpen, onClose, onAddTerm }) => {
  const [term, setTerm] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = {};
    if (!term.trim()) err.term = 'Term title is required';
    if (!details.trim()) err.details = 'Term description is required';

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    onAddTerm({
      id: Date.now(),
      termTitle: term.trim(),
      termDescription: details.trim(),
      term: term.trim(),
      details: details.trim(),
      isMandatory: true,
      termMasterId: 0,
    });
    setTerm('');
    setDetails('');
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Add Term & Condition</h2>
            <p className="text-xs text-gray-400">Specify customized contractual clauses</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Term Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                if (errors.term) setErrors((prev) => ({ ...prev, term: '' }));
              }}
              placeholder="e.g. Payment Terms, Price Escalation, Penalty Clause"
              className="w-full h-10 px-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20"
            />
            {errors.term && <p className="text-[11px] text-red-500 mt-1">{errors.term}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Clause Details <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if (errors.details) setErrors((prev) => ({ ...prev, details: '' }));
              }}
              placeholder="Enter comprehensive clause explanation or stipulations..."
              className="w-full p-3 text-xs rounded-xl border border-[#C3C6D1] bg-white focus:outline-none focus:ring-2 focus:ring-[#084E92]/20 resize-none"
            />
            {errors.details && <p className="text-[11px] text-red-500 mt-1">{errors.details}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#084E92] hover:bg-[#00376C] rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              Add Term
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTermModal;
