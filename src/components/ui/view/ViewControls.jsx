import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Reusable View Controls Component
 * @param {Object} props
 * @param {String} props.searchQuery - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {Function} props.onFilterClick - Filter button click handler
 * @param {Function} props.onCreateClick - Create button click handler
 * @param {String} props.createLabel - Label for create button
 * @param {String} props.searchPlaceholder - Placeholder for search input
 * @param {Boolean} props.showFilter - Show filter button
 * @param {Boolean} props.showCreate - Show create button
 * @param {React.ReactNode} props.additionalControls - Additional controls to render
 */
export const ViewControls = ({
  searchQuery = '',
  onSearchChange,
  onFilterClick,
  onCreateClick,
  createLabel = 'Create',
  searchPlaceholder = 'Search...',
  showFilter = true,
  showCreate = true,
  additionalControls,
}) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {onSearchChange && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-80"
            />
          </div>
        )}
        {additionalControls}
      </div>

      <div className="flex items-center gap-2">
        {showFilter && onFilterClick && (
          <Button
            variant="ghost"
            size="md"
            className="gap-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400"
            onClick={onFilterClick}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
        )}
        {showCreate && onCreateClick && (
          <Button
            className="gap-2 bg-[#005BA8] hover:bg-[#005BA8]/90 text-white"
            onClick={onCreateClick}
          >
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
