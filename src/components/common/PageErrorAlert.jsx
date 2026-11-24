import React from 'react';

/**
 * Standardized in-page error banner with an optional Retry button.
 * Placed at the top of the page (under page header, above search/filters/table).
 */
export const PageErrorAlert = ({ error, onRetry, className = 'mb-6' }) => {
  if (!error) return null;
  const message = typeof error === 'string' ? error : (error?.message || 'Something went wrong.');

  return (
    <div className={`rounded-xl border border-[#F0B4BC] bg-[#FBEAEC] px-4 py-3 flex items-center justify-between ${className}`}>
      <span className="text-sm text-[#C0293D]">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-[#C0293D] underline shrink-0 cursor-pointer bg-transparent border-0 ml-4 hover:opacity-80 transition"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default PageErrorAlert;
