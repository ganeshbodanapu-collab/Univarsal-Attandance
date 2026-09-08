import React, { useState, useMemo } from 'react';
import type { Worker, Site, Section } from '../../types';
import { Modal } from '../common/Modal';
import {
  Search,
  Building2,
  Layers,
  Phone,
  CreditCard,
  UserCheck,
  Users,
  X,
  Sparkles,
} from 'lucide-react';

interface WorkerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Worker[];
  sites: Site[];
  sections: Section[];
  selectedWorkerId?: string;
  onSelectWorker: (worker: Worker) => void;
}

export const WorkerSearchModal: React.FC<WorkerSearchModalProps> = ({
  isOpen,
  onClose,
  workers,
  sites,
  sections,
  selectedWorkerId,
  onSelectWorker,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'all' | 'company' | 'outside'>('all');

  const filteredSections = useMemo(() => {
    if (!siteFilter) return sections;
    return sections.filter((s) => s.siteId === siteFilter);
  }, [sections, siteFilter]);

  const filteredWorkers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workers.filter((w) => {
      // Site filter
      if (siteFilter && w.currentSiteId !== siteFilter) return false;
      // Section filter
      if (sectionFilter && w.currentSectionId !== sectionFilter) return false;
      // Type filter
      if (workerTypeFilter !== 'all' && w.workerType !== workerTypeFilter) return false;

      // Text search
      if (!q) return true;

      const nameMatch = w.name.toLowerCase().includes(q);
      const idMatch = w.id.toLowerCase().includes(q);
      const serialMatch = w.serialNumber ? w.serialNumber.toLowerCase().includes(q) : false;
      const mobileMatch = w.mobile.includes(q);
      const aadhaarMatch = w.idProofNumber ? w.idProofNumber.toLowerCase().includes(q) : false;

      const siteObj = sites.find((s) => s.id === w.currentSiteId);
      const siteMatch = siteObj ? siteObj.name.toLowerCase().includes(q) || siteObj.code.toLowerCase().includes(q) : false;

      const secObj = sections.find((s) => s.id === w.currentSectionId);
      const secMatch = secObj ? secObj.name.toLowerCase().includes(q) || secObj.code.toLowerCase().includes(q) : false;

      return nameMatch || idMatch || serialMatch || mobileMatch || aadhaarMatch || siteMatch || secMatch;
    });
  }, [workers, searchTerm, siteFilter, sectionFilter, workerTypeFilter, sites, sections]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search & Select Employee"
      subtitle="Find employees across all sites and sections by Name, Employee ID, Aadhaar, Serial No., or Mobile"
      icon={<Search className="h-5 w-5 text-blue-600" />}
      size="xl"
    >
      <div className="space-y-4">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            placeholder="Type Employee Name, ID (e.g. 01BGM, W001), Aadhaar, or Mobile Number..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* Site Filter */}
          <div>
            <select
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value);
                setSectionFilter('');
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="">All Project Sites ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="">All Trade Sections</option>
              {filteredSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} ({sec.code})
                </option>
              ))}
            </select>
          </div>

          {/* Worker Type Filter */}
          <div>
            <select
              value={workerTypeFilter}
              onChange={(e) => setWorkerTypeFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Employment Types</option>
              <option value="company">Company Employees Only</option>
              <option value="outside">Outside / Sub-Contractor Only</option>
            </select>
          </div>
        </div>

        {/* Results Count & Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 pt-1 border-t border-slate-100">
          <span>
            Found <strong className="text-slate-800">{filteredWorkers.length}</strong> matching employees
          </span>
          {searchTerm && (
            <span className="text-blue-600 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Live Search Active</span>
            </span>
          )}
        </div>

        {/* Worker Cards Grid (Scrollable) */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {filteredWorkers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Users className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No matching employees found</p>
              <p className="text-[11px] text-slate-400">
                Try clearing or changing your search terms and filters above.
              </p>
            </div>
          ) : (
            filteredWorkers.map((w) => {
              const isCurrent = w.id === selectedWorkerId;
              const siteObj = sites.find((s) => s.id === w.currentSiteId);
              const secObj = sections.find((s) => s.id === w.currentSectionId);

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    onSelectWorker(w);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-blue-300 shadow-2xs'
                  }`}
                >
                  {/* Left: Avatar & Details */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-2xs">
                      {w.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">{w.name}</span>
                        <span className="font-mono text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                          {w.id}
                        </span>
                        {w.serialNumber && (
                          <span className="font-mono text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200">
                            {w.serialNumber}
                          </span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            w.workerType === 'company'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {w.workerType}
                        </span>
                      </div>

                      {/* Location & Contact Meta */}
                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center space-x-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <strong className="text-slate-700 font-medium">
                            {siteObj?.name || w.currentSiteId}
                          </strong>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center space-x-1">
                          <Layers className="h-3 w-3 text-purple-500" />
                          <span>{secObj?.name || w.currentSectionId}</span>
                        </span>
                        {w.mobile && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center space-x-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{w.mobile}</span>
                            </span>
                          </>
                        )}
                        {w.idProofNumber && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center space-x-1">
                              <CreditCard className="h-3 w-3 text-slate-400" />
                              <span className="font-mono">{w.idProofNumber}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Daily Wage & Action Button */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Wage</span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        ₹{w.dailyWage.toLocaleString('en-IN')}/day
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{isCurrent ? 'Selected' : 'Select'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
export default WorkerSearchModal;
