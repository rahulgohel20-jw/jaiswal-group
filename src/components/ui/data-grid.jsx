'use client';

import { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const DataGridContext = createContext(undefined);

function useDataGrid() {
  const context = useContext(DataGridContext);
  if (!context) {
    throw new Error('useDataGrid must be used within a DataGridProvider');
  }
  return context;
}

function DataGridProvider({ children, table, ...props }) {
  return (
    <DataGridContext.Provider
      value={{
        props,
        table,
        recordCount: props.recordCount,
        isLoading: props.isLoading || false,
      }}
    >
      {children}
    </DataGridContext.Provider>
  );
}

function DataGrid({ children, table, ...props }) {
  const defaultProps = {
    loadingMode: 'skeleton',
    tableLayout: {
      dense: false,
      cellBorder: false,
      rowBorder: true,
      rowRounded: false,
      stripped: false,
      headerSticky: false,
      headerBackground: true,
      headerBorder: true,
      width: 'fixed',
      columnsVisibility: false,
      columnsResizable: false,
      columnsPinnable: false,
      columnsMovable: false,
      columnsDraggable: false,
      rowsDraggable: false,
    },
    tableClassNames: {
      base: '',
      header: '',
      headerRow: '',
      headerSticky: 'sticky top-0 z-10 bg-background/90 backdrop-blur-xs',
      body: '',
      bodyRow: '',
      footer: '',
      edgeCell: '',
    },
  };

  const mergedProps = {
    ...defaultProps,
    ...props,
    tableLayout: {
      ...defaultProps.tableLayout,
      ...(props.tableLayout || {}),
    },
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...(props.tableClassNames || {}),
    },
  };

  // Ensure table is provided
  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  return (
    <DataGridProvider table={table} {...mergedProps}>
      {children}
    </DataGridProvider>
  );
}

function DataGridContainer({ children, className, border = true }) {
  return (
    <div
      data-slot="data-grid"
      className={cn(
        'grid w-full',
        border && 'border border-border rounded-lg',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { useDataGrid, DataGridProvider, DataGrid, DataGridContainer };
