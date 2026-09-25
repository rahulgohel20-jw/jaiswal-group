import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Reusable CodeCell component for rendering compact code identifiers (PR, PO, GRN, Transfer, etc.)
 * - Truncates gracefully with ellipsis when text overflows maxWidth
 * - Displays a sleek tooltip with the full code on hover
 * - Supports custom styling, click actions, and optional subtitles
 */
export const CodeCell = ({
  code,
  value,
  maxWidth = 'max-w-[110px]',
  className = '',
  onClick,
  subtitle,
  children,
}) => {
  const displayValue = code ?? value ?? children;
  const strVal = displayValue != null && displayValue !== '' ? String(displayValue) : '—';
  const hasValue = strVal !== '—' && strVal !== '';

  const content = (
    <span
      onClick={onClick}
      title={strVal}
      className={`font-semibold text-[#084E92] text-sm truncate ${maxWidth} block ${
        onClick ? 'hover:underline cursor-pointer' : 'cursor-default'
      } ${className}`}
    >
      {strVal}
    </span>
  );

  if (!hasValue) {
    return <span className="text-gray-400 text-sm font-semibold">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{strVal}</p>
        </TooltipContent>
      </Tooltip>
      {subtitle && <div>{subtitle}</div>}
    </div>
  );
};

export default CodeCell;
