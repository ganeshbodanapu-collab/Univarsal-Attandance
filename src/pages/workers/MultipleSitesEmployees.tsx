import React, { useState, useMemo } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Toast } from '../../components/common/Toast';
import { WorkerSearchModal } from '../../components/workers/WorkerSearchModal';
import { CustomSiteMigrationModal } from '../../components/workers/CustomSiteMigrationModal';
import { WorkerMultiSiteSummaryModal } from '../../components/workers/WorkerMultiSiteSummaryModal';
import { WorkerAttendanceModal } from '../../components/attendance/WorkerAttendanceModal';
import { EnrollFaceModal } from '../../components/workers/EnrollFaceModal';
import type { Worker } from '../../types';
import {
  Users,
  Search,
  Building2,
  Layers,
  ArrowRightLeft,
  Briefcase,
  Trash2,
  Camera,
  Fingerprint,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Scan,
} from 'lucide-react';

export const MultipleSitesEmployees: React.FC = () => {
  const {
    workers,
    sites,
    sections,
    attendance,
    deleteAttendanceRecord,
    siteMigrations,
  } = useAttendanceContext();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Worker
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.id || '');
  const selectedWorker = useMemo(() => {
    return workers.find((w) => w.id === selectedWorkerId) || workers[0];
  }, [workers, selectedWorkerId]);

  // Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isRegularModalOpen, setIsRegularModalOpen] = useState(false);
  const [regularModalInitialTab, setRegularModalInitialTab] = useState<'manual' | 'face' | 'fingerprint'>('face');

  // Face ID Enrollment state
  const [selectedWorkerForFaceEnroll, setSelectedWorkerForFaceEnroll] = useState<Worker | null>(null);
  const [isEnrollFaceModalOpen, setIsEnrollFaceModalOpen] = useState(false);

  // Employee Wise Table filter states
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSiteFilter, setEmployeeSiteFilter] = useState('');
  const [showMultiSiteOnly, setShowMultiSiteOnly] = useState(false);
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  // Handle worker selection
  const handleSelectWorker = (w: Worker) => {
    setSelectedWorkerId(w.id);
  };

  // Compute Employee-Wise Multiple Sites Aggregation
  const employeeWiseData = useMemo(() => {
    return workers.map((w) => {
      const homeSite = sites.find((s) => s.id === w.currentSiteId);
      const homeSection = sections.find((sec) => sec.id === w.currentSectionId);
      const wAtt = attendance
        .filter((a) => a.workerId === w.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      const siteDutyMap: Record<
        string,
        { siteId: string; siteName: string; daysCount: number; mandays: number }
      > = {};

      let totalPresent = 0;
      let totalHalf = 0;
      let totalSiteCashGiven = 0;

      wAtt.forEach((a) => {
        totalSiteCashGiven += a.siteAmountGiven || 0;
        if (a.status === 'present' || a.status === 'halfDay') {
          const sId = a.siteId || w.currentSiteId || 'default';
          const sName =
            sites.find((s) => s.id === sId)?.name ||
            (sId !== 'default' ? sId : homeSite?.name || 'Primary Site');

          if (!siteDutyMap[sId]) {
            siteDutyMap[sId] = { siteId: sId, siteName: sName, daysCount: 0, mandays: 0 };
          }
          siteDutyMap[sId].daysCount += 1;
          const shiftManday = a.status === 'present' ? 1 : 0.5;
          siteDutyMap[sId].mandays += shiftManday;

          if (a.status === 'present') totalPresent++;
          if (a.status === 'halfDay') totalHalf++;
        }
      });

      const workingPlacesBreakdown = Object.values(siteDutyMap).sort((a, b) => b.daysCount - a.daysCount);
      const totalMandays = totalPresent + totalHalf * 0.5;
      const totalWageEarned = totalPresent * w.dailyWage + totalHalf * (w.dailyWage * 0.5);
      const netBalance = totalWageEarned - totalSiteCashGiven;
      const isMultiSite = workingPlacesBreakdown.length > 1;

      return {
        worker: w,
        homeSiteName: homeSite?.name || w.currentSiteId,
        homeSectionName: homeSection?.name || w.currentSectionId || 'General Section',
        workingPlacesBreakdown,
        totalPresentDays: totalPresent,
        totalHalfDays: totalHalf,
        totalMandays,
        totalWageEarned,
        totalSiteCashGiven,
        netBalance,
        isMultiSite,
        attendanceRecords: wAtt,
      };
    });
  }, [workers, attendance, sites, sections]);

  // Filtered employees for the employee-wise table
  const filteredEmployees = useMemo(() => {
    return employeeWiseData.filter((emp) => {
      if (showMultiSiteOnly && !emp.isMultiSite) {
        return false;
      }
      if (employeeSiteFilter) {
        const matchesHome = emp.worker.currentSiteId === employeeSiteFilter;
        const matchesWorkingSite = emp.workingPlacesBreakdown.some((wp) => wp.siteId === employeeSiteFilter);
        if (!matchesHome && !matchesWorkingSite) return false;
      }
      if (employeeSearch) {
        const q = employeeSearch.toLowerCase();
        const matchesName = emp.worker.name.toLowerCase().includes(q);
        const matchesId = emp.worker.id.toLowerCase().includes(q);
        const matchesMobile = emp.worker.mobile?.toLowerCase().includes(q);
        const matchesSite =
          emp.workingPlacesBreakdown.some((wp) => wp.siteName.toLowerCase().includes(q)) ||
          emp.homeSiteName.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesMobile && !matchesSite) return false;
      }
      return true;
    });
  }, [employeeWiseData, showMultiSiteOnly, employeeSiteFilter, employeeSearch]);

  // Multi-site workers count (workers with > 1 site attendance or migration)
  const multiSiteWorkers = useMemo(() => {
    return workers.filter((w) => {
      const wAtt = attendance.filter((a) => a.workerId === w.id);
      const siteSet = new Set<string>();
      siteSet.add(w.currentSiteId);
      wAtt.forEach((a) => {
        if (a.siteId) siteSet.add(a.siteId);
      });
      return siteSet.size > 1;
    });
  }, [workers, attendance]);

  // Total site disbursements recorded
  const totalSiteDisbursements = useMemo(() => {
    return attendance.reduce((sum, a) => sum + (a.siteAmountGiven || 0), 0);
  }, [attendance]);

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Multiple Sites Employees
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Record attendance at any project site &amp; section, note site-given amounts, and manage cross-site worker migrations.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 inline-flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-blue-600" />
            <span>Search Employee Modal</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMigrationModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
            <span>Employees Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Briefcase className="h-3.5 w-3.5 text-amber-400" />
            <span>Worker Multi-Site Summary</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Multi-Site Workforce</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
            {multiSiteWorkers.length} Workers
          </span>
          <span className="text-[10px] text-indigo-600 font-semibold">Active Across 2+ Sites</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Project Sites</span>
          <span className="text-xl font-black text-blue-700 font-mono mt-0.5 block">
            {sites.length} Sites
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">{sections.length} Trade Sections</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Site Disbursements</span>
          <span className="text-xl font-black text-amber-700 font-mono mt-0.5 block">
            ₹{totalSiteDisbursements.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700 font-semibold">Given Directly on Sites</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Employees Transfer Logged</span>
          <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
            {siteMigrations.length} Transfers
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">Site &amp; Section Shifts</span>
        </div>
      </div>

      {/* Employee Selection & Quick Regular Attendance Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Employee Dropdown & Search */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Select Employee (Dropdown &amp; Search):</span>
              </label>

              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1 cursor-pointer"
              >
                <Search className="h-3 w-3" />
                <span>Open Search Modal</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    const w = workers.find((wk) => wk.id === e.target.value);
                    if (w) handleSelectWorker(w);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {workers.map((w) => {
                    const s = sites.find((site) => site.id === w.currentSiteId);
                    return (
                      <option key={w.id} value={w.id}>
                        {w.serialNumber ? `${w.serialNumber} • ` : ''}
                        {w.name} ({w.id}) {w.designation || w.purpose ? `[${w.designation || w.purpose}] ` : ''}— Home: {s?.name || w.currentSiteId} • ₹{w.dailyWage}/d
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title="Search workers by Name, Aadhaar, Mobile, or Site"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Quick Regular Attendance Modal Launchers (Face ID / Fingerprint / Manual) */}
          {selectedWorker && (
            <div className="lg:border-l lg:border-slate-200 lg:pl-6 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Mark Attendance for {selectedWorker.name}:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer inline-flex items-center space-x-1"
                >
                  <Briefcase className="h-3 w-3 text-amber-500" />
                  <span>Places Summary &rarr;</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegularModalInitialTab('face');
                    setIsRegularModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Mark attendance using Face ID Scanner"
                >
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span>Face ID Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegularModalInitialTab('fingerprint');
                    setIsRegularModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Mark attendance using Fingerprint Scanner"
                >
                  <Fingerprint className="h-4 w-4 text-emerald-600" />
                  <span>Fingerprint Scan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegularModalInitialTab('manual');
                    setIsRegularModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Open Regular Manual Entry Modal"
                >
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Regular Modal (All Tabs)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EMPLOYEE-WISE MULTIPLE SITES DEPLOYMENT & ATTENDANCE TABLE            */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header & Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Employee-Wise Multiple Sites Deployment &amp; Attendance Table
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Showing {filteredEmployees.length} of {workers.length} employees &bull; Site-wise working days, wages earned &amp; balances
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMultiSiteOnly(!showMultiSiteOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showMultiSiteOnly
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {showMultiSiteOnly ? '✓ Multi-Site Only (2+ Sites)' : 'Filter: Multi-Site Only'}
            </button>

            <select
              value={employeeSiteFilter}
              onChange={(e) => setEmployeeSiteFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="">All Project Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-56">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee name, ID, site..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Employee-Wise Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">Home Site &amp; Section</th>
                <th className="py-3 px-4">Working Places Breakdown</th>
                <th className="py-3 px-4 text-center">Total Shifts</th>
                <th className="py-3 px-4 text-right">Total Wages Earned</th>
                <th className="py-3 px-4 text-right">Site Cash Given</th>
                <th className="py-3 px-4 text-right">Net Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedWorkerId === emp.worker.id;
                  const isExpanded = expandedWorkerId === emp.worker.id;

                  return (
                    <React.Fragment key={emp.worker.id}>
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/50 hover:bg-indigo-50/70'
                            : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => handleSelectWorker(emp.worker)}
                      >
                        {/* Employee Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {emp.worker.photoUrl ? (
                                <img
                                  src={emp.worker.photoUrl}
                                  alt={emp.worker.name}
                                  className="h-full w-full object-cover rounded-xl"
                                />
                              ) : (
                                emp.worker.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">{emp.worker.name}</span>
                                {(emp.worker.designation || emp.worker.purpose) && (
                                  <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[9px]">
                                    {emp.worker.designation || emp.worker.purpose}
                                  </span>
                                )}
                                {emp.isMultiSite && (
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[9px]">
                                    Multi-Site
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                                <span>{emp.worker.id}</span>
                                <span>&bull;</span>
                                <span className="text-amber-700 font-bold">₹{emp.worker.dailyWage}/day</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Home Site & Section */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1 text-slate-800 font-semibold text-xs">
                              <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[140px]">{emp.homeSiteName}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                              <Layers className="h-3 w-3 text-purple-500 shrink-0" />
                              <span className="truncate max-w-[140px]">{emp.homeSectionName}</span>
                            </div>
                          </div>
                        </td>

                        {/* Working Places Breakdown */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {emp.workingPlacesBreakdown.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">No attendance marked</span>
                            ) : (
                              emp.workingPlacesBreakdown.map((wp) => (
                                <span
                                  key={wp.siteId}
                                  className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] font-medium inline-flex items-center space-x-1"
                                >
                                  <span className="font-bold">{wp.siteName}</span>
                                  <span className="text-emerald-700 font-mono font-bold">
                                    Working {wp.daysCount} days
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({wp.mandays}m)
                                  </span>
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Total Shifts */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {emp.totalPresentDays}P {emp.totalHalfDays > 0 ? `+ ${emp.totalHalfDays}H` : ''}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {emp.totalMandays} Mandays
                          </span>
                        </td>

                        {/* Total Wages Earned */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 text-xs">
                            ₹{emp.totalWageEarned.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Site Cash Given */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-rose-700 text-xs">
                            {emp.totalSiteCashGiven > 0 ? `-₹${emp.totalSiteCashGiven.toLocaleString('en-IN')}` : '₹0'}
                          </span>
                        </td>

                        {/* Net Balance */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black inline-block ${
                              emp.netBalance > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : emp.netBalance < 0
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            ₹{emp.netBalance.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectWorker(emp.worker);
                                setRegularModalInitialTab('face');
                                setIsRegularModalOpen(true);
                              }}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Mark Regular Attendance"
                            >
                              <Camera className="h-3 w-3 text-blue-600" />
                              <span>Mark</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorkerForFaceEnroll(emp.worker);
                                setIsEnrollFaceModalOpen(true);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer ${
                                emp.worker.faceEnrolled
                                  ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title={emp.worker.faceEnrolled ? 'Re-Enroll Face ID' : 'Enroll Face ID'}
                            >
                              <Scan className="h-3 w-3 text-cyan-600" />
                              <span>{emp.worker.faceEnrolled ? 'Re-Enroll Face' : 'Enroll Face'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectWorker(emp.worker);
                                setIsMigrationModalOpen(true);
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Employees Transfer (Site to Site or Section to Section)"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-indigo-600" />
                              <span>Transfer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectWorker(emp.worker);
                                setIsSummaryModalOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                              title="View Multi-Site Summary"
                            >
                              <Briefcase className="h-3 w-3 text-amber-500" />
                              <span>Summary</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedWorkerId(isExpanded ? null : emp.worker.id)}
                              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                              title={isExpanded ? 'Hide shifts history' : 'Show itemized shift history'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer: Itemized Date-Wise Shift Records */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="p-4 border-t border-b border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                                  <Building2 className="h-4 w-4 text-indigo-600" />
                                  <span>
                                    {emp.worker.name} &bull; Itemized Shift History ({emp.attendanceRecords.length} Records)
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Permanent ID: {emp.worker.id}
                                </span>
                              </div>

                              {emp.attendanceRecords.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No attendance shifts recorded for this worker yet.
                                </p>
                              ) : (
                                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                                        <th className="py-2 px-3">Date</th>
                                        <th className="py-2 px-3">Working Project Site</th>
                                        <th className="py-2 px-3">Trade Section</th>
                                        <th className="py-2 px-3 text-center">Status</th>
                                        <th className="py-2 px-3 text-center">Method</th>
                                        <th className="py-2 px-3 text-right">Wage Earned (₹)</th>
                                        <th className="py-2 px-3 text-right">Site Cash Given (₹)</th>
                                        <th className="py-2 px-3 text-right">Day Balance (₹)</th>
                                        <th className="py-2 px-3">Working Place Note</th>
                                        <th className="py-2 px-3 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {emp.attendanceRecords.map((att) => {
                                        const s = sites.find((st) => st.id === (att.siteId || emp.worker.currentSiteId));
                                        const sec = sections.find((sc) => sc.id === (att.sectionId || emp.worker.currentSectionId));
                                        const isCrossSite = att.siteId && att.siteId !== emp.worker.currentSiteId;
                                        const dailyWage = emp.worker.dailyWage || 0;
                                        const dayWage =
                                          att.status === 'present'
                                            ? dailyWage
                                            : att.status === 'halfDay'
                                            ? Math.round(dailyWage * 0.5)
                                            : 0;
                                        const siteAmount = att.siteAmountGiven || 0;
                                        const dayBal = dayWage - siteAmount;

                                        return (
                                          <tr key={att.id} className="hover:bg-slate-50/70 font-medium text-[11px]">
                                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{att.date}</td>
                                            <td className="py-2 px-3">
                                              <span className="font-bold text-slate-800">{s?.name || att.siteId || 'Site'}</span>
                                              {isCrossSite && (
                                                <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                                  Cross-Site
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">{sec?.name || att.sectionId || 'General'}</td>
                                            <td className="py-2 px-3 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                  att.status === 'present'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : att.status === 'halfDay'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                }`}
                                              >
                                                {att.status}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-center uppercase font-mono text-[10px] text-slate-500">
                                              {att.method}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                              ₹{dayWage.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                                              {siteAmount > 0 ? `₹${siteAmount.toLocaleString('en-IN')}` : '₹0'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                              ₹{dayBal.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                                              {att.workingPlaceNote || att.siteAmountRemarks || att.remarks || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (confirm(`Delete attendance record ${att.id}?`)) {
                                                    deleteAttendanceRecord(att.id);
                                                    setToastMessage('Attendance record deleted.');
                                                  }
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="Delete Shift Record"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Search Employee Modal */}
      <WorkerSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        workers={workers}
        sites={sites}
        sections={sections}
        selectedWorkerId={selectedWorkerId}
        onSelectWorker={handleSelectWorker}
      />

      {/* MODAL 2: Employees Transfer Modal (Site to Site & Section to Section) */}
      <CustomSiteMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        worker={selectedWorker}
        allWorkers={workers}
        sites={sites}
        sections={sections}
        onSuccess={(msg) => setToastMessage(msg)}
      />

      {/* MODAL 3: Worker Multi-Site Summary Modal */}
      <WorkerMultiSiteSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        worker={selectedWorker}
        sites={sites}
        sections={sections}
      />

      {/* MODAL 4: Regular Attendance Modal (Face ID, Fingerprint, Manual) */}
      {selectedWorker && (
        <WorkerAttendanceModal
          isOpen={isRegularModalOpen}
          onClose={() => setIsRegularModalOpen(false)}
          worker={selectedWorker}
          sites={sites}
          sections={sections}
          allowSiteSelection={true}
          initialTab={regularModalInitialTab}
          onSuccess={(workerName, message) => setToastMessage(`${workerName}: ${message}`)}
        />
      )}

      {/* MODAL 5: Enroll Face ID Modal */}
      <EnrollFaceModal
        isOpen={isEnrollFaceModalOpen}
        onClose={() => setIsEnrollFaceModalOpen(false)}
        worker={selectedWorkerForFaceEnroll}
        onEnrolledSuccess={(wId) => setToastMessage(`Face ID successfully enrolled for worker ${wId}`)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default MultipleSitesEmployees;
