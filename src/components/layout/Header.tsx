import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  Users,
  Building,
  Layers,
  Award,
  ArrowRight,
  X,
  Sparkles,
  DollarSign,
  Camera,
  LogOut,
} from 'lucide-react';
import { useAttendanceContext } from '../../context/AttendanceContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { currentUser, logout, workers, sites, sections, referrers } = useAttendanceContext();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const cleanQ = query.toLowerCase().trim();

  // Search results
  const matchedWorkers = cleanQ
    ? workers
        .filter((w) => {
          const s = sites.find((site) => site.id === w.currentSiteId);
          const serial = `${s?.code || w.currentSiteId}-${w.id}`.toLowerCase();
          return (
            w.name.toLowerCase().includes(cleanQ) ||
            w.id.toLowerCase().includes(cleanQ) ||
            serial.includes(cleanQ) ||
            w.mobile.includes(cleanQ)
          );
        })
        .slice(0, 5)
    : [];

  const matchedSites = cleanQ
    ? sites
        .filter(
          (s) =>
            s.name.toLowerCase().includes(cleanQ) ||
            s.code.toLowerCase().includes(cleanQ) ||
            s.location.toLowerCase().includes(cleanQ)
        )
        .slice(0, 3)
    : [];

  const matchedSections = cleanQ
    ? sections
        .filter(
          (sec) =>
            sec.name.toLowerCase().includes(cleanQ) ||
            sec.code.toLowerCase().includes(cleanQ)
        )
        .slice(0, 3)
    : [];

  const matchedReferrers = cleanQ
    ? referrers
        .filter(
          (r) =>
            r.name.toLowerCase().includes(cleanQ) ||
            r.mobile.includes(cleanQ)
        )
        .slice(0, 3)
    : [];

  const handleSelect = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  return (
    <>
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 print:hidden transition-all">
        {/* Left side: Hamburger on mobile + Search / Welcome */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0 pr-4">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global Search with shortcut hint */}
          <div className="max-w-md w-full hidden sm:block relative">
            <button
              onClick={() => setIsOpen(true)}
              className="w-full pl-10 pr-12 py-2 text-left text-xs sm:text-sm bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-400 flex items-center justify-between shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors absolute left-3.5" />
                <span className="text-slate-500 group-hover:text-slate-700 font-medium">
                  Search workers, sites, sections (⌘K)...
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </span>
            </button>
          </div>

          {/* Mobile search icon trigger */}
          <button
            onClick={() => setIsOpen(true)}
            className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <div className="text-xs sm:text-sm text-slate-500 truncate sm:hidden">
            Hi, <span className="text-blue-600 font-bold">{currentUser?.name || 'User'}</span>
          </div>
        </div>

        {/* Right side: Active User, Switch Site & Notifications */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* Active Supervisor / User Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs shadow-2xs">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-slate-800 text-xs leading-none">
                {currentUser?.name || 'Site Supervisor'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                {currentUser?.role === 'admin' ? 'Universal Admin' : `Supervisor • ${currentUser?.assignedSiteId || 'Site'}`}
              </span>
            </div>
          </div>

          {/* Switch Site / Logout Button */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Switch Site or Logout"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-500" />
            <span className="hidden md:inline">Switch Site</span>
          </button>

          {/* Notifications Button */}
          <button
            className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
          </button>
        </div>
      </header>

      {/* UNIVERSAL COMMAND PALETTE (Ctrl+K / ⌘K MODAL) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Card */}
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all z-10">
            {/* Search Input Bar */}
            <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <Search className="h-5 w-5 text-blue-600 shrink-0 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a worker name, permanent ID (W001), serial (S001-W001), site, or section..."
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {!cleanQ && (
                <div className="space-y-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Quick Navigation
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleSelect('/workers')}
                      className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-left transition-colors border border-slate-100"
                    >
                      <Users className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">All Workers</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/sites')}
                      className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-left transition-colors border border-slate-100"
                    >
                      <Building className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Project Sites</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/attendance/face')}
                      className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-left transition-colors border border-slate-100"
                    >
                      <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Face Scan</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/advances')}
                      className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-left transition-colors border border-slate-100"
                    >
                      <DollarSign className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Advances</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/reports')}
                      className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-left transition-colors border border-slate-100"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Reports & Analytics</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Workers Search Matches */}
              {matchedWorkers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Workers ({matchedWorkers.length})
                  </div>
                  {matchedWorkers.map((w) => {
                    const s = sites.find((site) => site.id === w.currentSiteId);
                    const serial = `${s?.code || w.currentSiteId}-${w.id}`;
                    return (
                      <button
                        key={w.id}
                        onClick={() => handleSelect(`/workers/${w.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200/60 text-left transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {w.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                                {w.name}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {w.id}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {serial}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {w.mobile} &bull; {s?.name} &bull; Daily: ₹{w.dailyWage}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sites Search Matches */}
              {matchedSites.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Project Sites ({matchedSites.length})
                  </div>
                  {matchedSites.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect(`/sites/${s.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200/60 text-left transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <Building className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                              {s.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {s.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">{s.location} &bull; Manager: {s.inCharge}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sections Matches */}
              {matchedSections.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Work Sections ({matchedSections.length})
                  </div>
                  {matchedSections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => handleSelect(`/sections/${sec.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200/60 text-left transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                              {sec.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              {sec.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">In Charge: {sec.inCharge}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Referrers Matches */}
              {matchedReferrers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Agents / Referrers ({matchedReferrers.length})
                  </div>
                  {matchedReferrers.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect('/referrers')}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200/60 text-left transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                            {r.name}
                          </span>
                          <span className="block text-[11px] text-slate-500">Phone: {r.mobile}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {cleanQ &&
                matchedWorkers.length === 0 &&
                matchedSites.length === 0 &&
                matchedSections.length === 0 &&
                matchedReferrers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No results found matching "{query}". Try checking your spelling or search by ID (e.g. W001, S001).
                  </div>
                )}
            </div>

            {/* Footer Shortcut Guide */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-2xs">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-2xs">
                    ENTER
                  </kbd>
                  <span>to select</span>
                </span>
              </div>
              <span className="font-mono text-blue-600 font-bold">Universal Search Engine</span>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default Header;
