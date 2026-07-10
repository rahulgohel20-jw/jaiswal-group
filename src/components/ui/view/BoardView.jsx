import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable Board View Component
 * @param {Object} props
 * @param {Array} props.data - Array of items to display
 * @param {Function} props.groupBy - Function to determine grouping key
 * @param {Array} props.columns - Array of column names/keys
 * @param {Function} props.renderCard - Function to render each card
 * @param {Function} props.onAddItem - Function called when "Add Item" is clicked
 * @param {String} props.addItemLabel - Label for add button (default: "Add Item")
 * @param {String} props.emptyMessage - Message when no items (default: "No items")
 */
export const BoardView = ({
  data = [],
  groupBy,
  columns = [],
  renderCard,
  onAddItem,
  addItemLabel = 'Add Item',
  emptyMessage = 'No items',
  columnWidth = 'w-96',
}) => {
  // Group data by the specified grouping function
  const groupedData = useMemo(() => {
    const groups = {};

    // Initialize all columns with empty arrays
    columns.forEach((col) => {
      groups[col] = [];
    });

    // Group the data
    data.forEach((item) => {
      const key = groupBy(item);
      if (groups[key]) {
        groups[key].push(item);
      }
    });

    return groups;
  }, [data, groupBy, columns]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {columns.map((columnKey) => (
          <BoardColumn
            key={columnKey}
            title={columnKey}
            items={groupedData[columnKey] || []}
            count={groupedData[columnKey]?.length || 0}
            renderCard={renderCard}
            onAddItem={onAddItem}
            addItemLabel={addItemLabel}
            emptyMessage={emptyMessage}
            columnWidth={columnWidth}
          />
        ))}
      </div>
    </div>
  );
};

// Board Column Component
const BoardColumn = ({
  title,
  items,
  count,
  renderCard,
  onAddItem,
  addItemLabel,
  emptyMessage,
  columnWidth,
}) => {
  return (
    <div
      className={`flex-shrink-0 ${columnWidth} bg-gray-50/50 rounded-lg border border-gray-200`}
    >
      {/* Column Header */}
      <div className="p-4 border-b bg-white rounded-t-lg">
        <h3 className="text-base font-semibold text-gray-700">
          {title} <span className="text-gray-400 font-normal">{count}</span>
        </h3>
      </div>

      {/* Items List */}
      <div className="p-4 space-y-3 min-h-[500px]">
        {items.length > 0 ? (
          items.map((item) => <div key={item.id}>{renderCard(item)}</div>)
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 mb-4 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="w-16 h-12 bg-gray-200 rounded"></div>
            </div>
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          </div>
        )}

        {onAddItem && (
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => onAddItem(title)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {addItemLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
