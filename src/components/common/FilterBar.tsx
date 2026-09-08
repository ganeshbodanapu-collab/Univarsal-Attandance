import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, onReset, className = '' }) => {
  return (
    <div
      className={`bg-white p-4 sm:p-5 border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4 ${className}`}
    >
      <div className="flex flex-wrap items-end gap-3 flex-1">
        <div className="flex items-center space-x-1.5 text-slate-500 mr-1 self-center md:self-end pb-2">
          <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            Filters
          </span>
        </div>
        {children}
      </div>

      {onReset && (
        <button
          onClick={onReset}
          className="flex items-center justify-center px-3.5 py-2 border border-slate-200 rounded-xl shadow-2xs text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 h-9 self-end transition-all active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
export default FilterBar;
