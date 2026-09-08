import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  onSort,
  sortKey,
  sortDirection,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-xs bg-white">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/90 border-b border-slate-200/80">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable && onSort;
                const colKey = (col.sortKey || col.accessor || '') as string;
                const isSorted = sortKey === colKey;

                return (
                  <th
                    key={idx}
                    onClick={() => isSortable && colKey && onSort(colKey)}
                    className={`px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider ${
                      isSortable
                        ? 'cursor-pointer select-none hover:bg-slate-100/80 hover:text-slate-800 transition-colors'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 hover:text-slate-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100 text-sm">
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-blue-50/35 transition-colors duration-100"
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-slate-700">
                    {col.render
                      ? col.render(row, rowIdx)
                      : col.accessor
                      ? (row[col.accessor] as unknown as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default DataTable;
