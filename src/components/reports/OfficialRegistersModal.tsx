import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import {
  Search,
  X,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export interface ReportItemDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  category?: 'attendance' | 'advances' | 'food' | 'overall';
}

interface OfficialRegistersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeReport: string;
  onSelectReport: (reportId: string) => void;
  reportDefinitions: ReportItemDefinition[];
}

export const OfficialRegistersModal: React.FC<OfficialRegistersModalProps> = ({
  isOpen,
  onClose,
  activeReport,
  onSelectReport,
  reportDefinitions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Category tags for the 7 core reports
  const categories = [
    { id: 'all', label: 'All Reports (7)', count: 7 },
    { id: 'attendance', label: 'Attendance & Muster', count: 3 },
    { id: 'transfers', label: 'Transfers & Migrations', count: 1 },
    { id: 'advances', label: 'Advances & Finance', count: 1 },
    { id: 'food', label: 'Food & Meals', count: 1 },
    { id: 'overall', label: '360° Overall Master', count: 1 },
  ];

  // Helper category mapping
  const getCategory = (id: string): string => {
    if (['daily-attendance-section', 'weekly-attendance', 'monthly-attendance'].includes(id)) {
      return 'attendance';
    }
    if (['transfers-report'].includes(id)) {
      return 'transfers';
    }
    if (['advance-payments'].includes(id)) {
      return 'advances';
    }
    if (['food-report'].includes(id)) {
      return 'food';
    }
    if (['overall-reports'].includes(id)) {
      return 'overall';
    }
    return 'attendance';
  };

  const filteredReports = useMemo(() => {
    return reportDefinitions.filter((rep) => {
      const cat = getCategory(rep.id);
      if (selectedCategory !== 'all' && cat !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rep.name.toLowerCase().includes(q);
        const matchDesc = rep.desc.toLowerCase().includes(q);
        const matchId = rep.id.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchId) return false;
      }

      return true;
    });
  }, [reportDefinitions, selectedCategory, searchQuery]);

  const handlePick = (id: string) => {
    onSelectReport(id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reports & Analytics Directory"
      subtitle="Select from the 7 specialized section-wise, employee-wise, transfers, and consolidated statutory audit reports"
      icon={<BookOpen className="h-5 w-5 text-blue-600" />}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredReports.length} of {reportDefinitions.length} reports
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Category Filter Toolbar */}
        <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports by title, section, frequency, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-slate-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => {
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Grid of Reports */}
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No reports match your search</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting &quot;All Reports&quot;.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1 scrollbar-thin">
            {filteredReports.map((rep) => {
              const isActive = rep.id === activeReport;
              const Icon = rep.icon;
              const cat = getCategory(rep.id);

              return (
                <div
                  key={rep.id}
                  onClick={() => handlePick(rep.id)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 text-left ${
                    isActive
                      ? 'bg-blue-50/60 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-white hover:bg-slate-50/90 border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* Top: Icon & Category Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {rep.name}
                        </h4>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                          {cat}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {rep.desc}
                  </p>

                  {/* Bottom Action Hint */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                      Includes PNG & PDF Export
                    </span>
                    <span className="text-blue-600 inline-flex items-center space-x-0.5 group-hover:translate-x-1 transition-transform">
                      <span>Select Report</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OfficialRegistersModal;
