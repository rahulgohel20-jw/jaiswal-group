import React from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

/**
 * Standardized PageHeader component for ERP pages.
 * Features:
 * - Compact top alignment to maximize screen real estate
 * - Bold title & optional subtitle with minimal spacing
 * - Optional back button & badge
 * - Right-aligned action buttons slot (HeaderActionButton, etc.)
 */
export const PageHeader = ({
  title,
  description,
  actions,
  action,
  backTo,
  onBack,
  badge,
  className = '',
  children,
}) => {
  const actionContent = actions || action;

  return (
    <div className={`pt-0 pb-0 ${className}`.trim()}>
      {/* Main Header Row */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Optional Back Button */}
          {backTo && (
            <Link
              to={backTo}
              className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </Link>
          )}

          {onBack && !backTo && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && (
                <h1
                  className="text-xl sm:text-2xl font-bold text-[#101828] leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {title}
                </h1>
              )}
              {badge}
            </div>

            {description && (
              <p className="text-[#667085] text-xs max-w-2xl mt-0.5 leading-normal break-words">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Action Button(s) Slot */}
        {actionContent && (
          <div className="flex items-center gap-2 shrink-0">
            {actionContent}
          </div>
        )}
      </div>

      {children}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.node,
  description: PropTypes.node,
  actions: PropTypes.node,
  action: PropTypes.node,
  backTo: PropTypes.string,
  onBack: PropTypes.func,
  badge: PropTypes.node,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default PageHeader;
