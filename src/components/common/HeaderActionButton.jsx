import React from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';

/**
 * Reusable Header Action Button component with standardized sizing,
 * typography, padding, and hover states matching the Generate GRN button design.
 */
export const HeaderActionButton = ({
  to,
  onClick,
  icon: Icon = Plus,
  children,
  label,
  className = '',
  disabled = false,
  variant = 'primary',
  ...props
}) => {
  const content = (
    <>
      {Icon && (
        React.isValidElement(Icon) ? (
          Icon
        ) : (
          <Icon className="w-3.5 h-3.5 shrink-0" />
        )
      )}
      <span>{children || label}</span>
    </>
  );

  const baseClasses =
    variant === 'outline'
      ? 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#C3C6D1] text-[#43474F] text-xs font-semibold cursor-pointer hover:bg-gray-50 transition shadow-2xs whitespace-nowrap'
      : 'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white bg-[#084E92] text-xs font-semibold border-0 cursor-pointer hover:bg-[#073e77] transition shadow-2xs whitespace-nowrap';

  const combinedClasses = `${baseClasses} ${disabled ? 'opacity-60 pointer-events-none' : ''} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
      {...props}
    >
      {content}
    </button>
  );
};

export default HeaderActionButton;
