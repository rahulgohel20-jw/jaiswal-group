import React from 'react';

/**
 * Reusable View Mode Selector Component
 * @param {Object} props
 * @param {Array} props.modes - Array of mode objects with { id, icon, label }
 * @param {String} props.activeMode - Currently active mode id
 * @param {Function} props.onModeChange - Mode change handler
 */
export const ViewModeSelector = ({ modes = [], activeMode, onModeChange }) => {
  return (
    <div className="mb-6 flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
      {modes.map((mode) => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeMode === mode.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};
