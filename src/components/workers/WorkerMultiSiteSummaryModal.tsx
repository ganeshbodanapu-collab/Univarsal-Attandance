import React, { useState, useMemo } from 'react';
import type { Worker, Site, Section } from '../../types';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Modal } from '../common/Modal';
import {
  Building2,
  Briefcase,
  MapPin,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Camera,
  Fingerprint,
  FileText,
} from 'lucide-react';

interface WorkerMultiSiteSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  sites: Site[];
  sections: Section[];
}

export const WorkerMultiSiteSummaryModal: React.FC<WorkerMultiSiteSummaryModalProps> = ({
  isOpen,
  onClose,
  worker,
  sites,
  sections,
}) => {
  const { attendance, assignments, siteMigrations } = useAttendanceContext();
  const [activeViewTab, setActiveViewTab] = useState<'sites' | 'dates' | 'migrations'>('sites');

  // All attendance records for this worker
  const workerAttendance = useMemo(() => {
    if (!worker) return [];
    return attendance.filter((a) => a.workerId === worker.id);
  }, [worker, attendance]);

  // Aggregate stats per site
  const siteBreakdown = useMemo(() => {
    if (!worker) return [];

    const siteMap = new Map<
      string,
      {
        siteId: string;
        presentDays: number;
        halfDays: number;
        totalMandays: number;
        grossWages: number;
        siteAmountsGiven: number;
        sectionIds: Set<string>;
        datesWorked: string[];
        lastDate: string;
      }
    >();

    // Scan all attendance records
    workerAttendance.forEach((att) => {
      // Resolve site: att.siteId || assignment site || worker's currentSiteId
      let resolvedSiteId = att.siteId;
      let resolvedSectionId = att.sectionId;

      if (!resolvedSiteId) {
        const asg = assignments.find((a) => a.id === att.assignmentId);
        resolvedSiteId = asg?.siteId || worker.currentSiteId;
        resolvedSectionId = asg?.sectionId || worker.currentSectionId;
      }

      if (!siteMap.has(resolvedSiteId)) {
        siteMap.set(resolvedSiteId, {
          siteId: resolvedSiteId,
          presentDays: 0,
          halfDays: 0,
          totalMandays: 0,
          grossWages: 0,
          siteAmountsGiven: 0,
          sectionIds: new Set<string>(),
          datesWorked: [],
          lastDate: att.date,
        });
      }

      const item = siteMap.get(resolvedSiteId)!;

      if (att.status === 'present') {
        item.presentDays += 1;
        item.totalMandays += 1;
        item.grossWages += worker.dailyWage;
        if (!item.datesWorked.includes(att.date)) {
          item.datesWorked.push(att.date);
        }
      } else if (att.status === 'halfDay') {
        item.halfDays += 1;
        item.totalMandays += 0.5;
        item.grossWages += worker.dailyWage * 0.5;
        if (!item.datesWorked.includes(att.date)) {
          item.datesWorked.push(att.date);
        }
      }

      if (att.siteAmountGiven && att.siteAmountGiven > 0) {
        item.siteAmountsGiven += att.siteAmountGiven;
      }

      if (resolvedSectionId) {
        item.sectionIds.add(resolvedSectionId);
      }

      if (att.date > item.lastDate) {
        item.lastDate = att.date;
      }
    });

    // Also include home site if not in map
    if (!siteMap.has(worker.currentSiteId)) {
      siteMap.set(worker.currentSiteId, {
        siteId: worker.currentSiteId,
        presentDays: 0,
        halfDays: 0,
        totalMandays: 0,
        grossWages: 0,
        siteAmountsGiven: 0,
        sectionIds: new Set<string>([worker.currentSectionId]),
        datesWorked: [],
        lastDate: worker.joiningDate,
      });
    }

    return Array.from(siteMap.values()).map((val) => {
      const siteObj = sites.find((s) => s.id === val.siteId);
      const sectionNames = Array.from(val.sectionIds)
        .map((secId) => sections.find((s) => s.id === secId)?.name || secId)
        .join(', ');

      const netSiteBalance = val.grossWages - val.siteAmountsGiven;
      const sortedDates = [...val.datesWorked].sort();

      return {
        ...val,
        datesWorked: sortedDates,
        netSiteBalance,
        siteName: siteObj?.name || val.siteId,
        siteCode: siteObj?.code || 'SITE',
        location: siteObj?.location || 'General Field',
        sectionNames: sectionNames || 'General Team',
        isHomeSite: val.siteId === worker.currentSiteId,
      };
    });
  }, [worker, workerAttendance, sites, sections, assignments]);

  // Chronological Date-Wise Log of all shifts and payments
  const dateWiseAttendanceLog = useMemo(() => {
    if (!worker) return [];
    return workerAttendance
      .map((att) => {
        let resolvedSiteId = att.siteId;
        let resolvedSectionId = att.sectionId;
        if (!resolvedSiteId) {
          const asg = assignments.find((a) => a.id === att.assignmentId);
          resolvedSiteId = asg?.siteId || worker.currentSiteId;
          resolvedSectionId = asg?.sectionId || worker.currentSectionId;
        }

        const siteObj = sites.find((s) => s.id === resolvedSiteId);
        const secObj = sections.find((s) => s.id === resolvedSectionId);

        let dayWage = 0;
        if (att.status === 'present') dayWage = worker.dailyWage;
        else if (att.status === 'halfDay') dayWage = worker.dailyWage * 0.5;

        const siteGiven = att.siteAmountGiven || 0;
        const netDayBalance = dayWage - siteGiven;

        return {
          id: att.id,
          date: att.date,
          siteId: resolvedSiteId,
          siteName: siteObj?.name || resolvedSiteId,
          siteCode: siteObj?.code || 'SITE',
          sectionId: resolvedSectionId,
          sectionName: secObj?.name || 'General',
          status: att.status,
          method: att.method || 'manual',
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          dayWage,
          siteGiven,
          netDayBalance,
          siteAmountMode: att.siteAmountMode,
          siteAmountRemarks: att.siteAmountRemarks,
          remarks: att.remarks || att.workingPlaceNote,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [worker, workerAttendance, sites, sections, assignments]);

  // Overall totals
  const totalMandays = siteBreakdown.reduce((sum, s) => sum + s.totalMandays, 0);
  const totalGrossWages = siteBreakdown.reduce((sum, s) => sum + s.grossWages, 0);
  const totalSiteAmounts = siteBreakdown.reduce((sum, s) => sum + s.siteAmountsGiven, 0);
  const overallNetBalance = totalGrossWages - totalSiteAmounts;
  const distinctSitesCount = siteBreakdown.filter((s) => s.totalMandays > 0).length;

  // Migrations for this worker
  const workerMigrations = useMemo(() => {
    if (!worker) return [];
    return siteMigrations.filter((m) => m.workerId === worker.id);
  }, [worker, siteMigrations]);

  if (!worker) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Worker Multi-Site Summary & Places Breakdown"
      subtitle={`Cross-site work locations, mandays distribution, and site allowances for ${worker.name}`}
      icon={<Briefcase className="h-5 w-5 text-blue-600" />}
      size="xl"
    >
      <div className="space-y-6">
        {/* Worker Info Card */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
              {worker.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{worker.name}</h3>
                <span className="font-mono text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded">
                  {worker.id}
                </span>
                {worker.serialNumber && (
                  <span className="font-mono text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 rounded">
                    {worker.serialNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-2">
                <span>
                  Primary Registered Site:{' '}
                  <strong className="text-white">
                    {sites.find((s) => s.id === worker.currentSiteId)?.name || worker.currentSiteId}
                  </strong>
                </span>
                <span>&bull;</span>
                <span className="font-mono text-amber-300 font-bold">
                  ₹{worker.dailyWage.toLocaleString('en-IN')}/day
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold text-slate-200 border border-white/10">
              🌐 Active Across {distinctSitesCount || 1} Sites
            </span>
          </div>
        </div>

        {/* Global Multi-Site KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Places Worked</span>
            <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
              {distinctSitesCount || 1} Sites
            </span>
            <span className="text-[10px] text-blue-600 font-semibold">Active Locations</span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">Total Mandays</span>
            <span className="text-lg font-black text-blue-900 font-mono mt-0.5 block">
              {totalMandays.toFixed(1)} Days
            </span>
            <span className="text-[10px] text-blue-700 font-semibold">Across All Sites</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Gross Wages Earned</span>
            <span className="text-lg font-black text-emerald-900 font-mono mt-0.5 block">
              ₹{totalGrossWages.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Earned in Sites</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Site Cash Given</span>
            <span className="text-lg font-black text-amber-900 font-mono mt-0.5 block">
              ₹{totalSiteAmounts.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">Disbursed on Sites</span>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Net Balance Due</span>
            <span
              className={`text-lg font-black font-mono mt-0.5 block ${
                overallNetBalance > 0 ? 'text-indigo-900' : overallNetBalance === 0 ? 'text-slate-600' : 'text-amber-800'
              }`}
            >
              ₹{overallNetBalance.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold">
              {overallNetBalance > 0 ? 'Due to Employee' : overallNetBalance === 0 ? 'Fully Settled' : 'Advance Taken'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveViewTab('sites')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeViewTab === 'sites'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Site Breakdown &amp; Dates</span>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
              {siteBreakdown.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('dates')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeViewTab === 'dates'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Date-Wise Attendance &amp; Cash Given</span>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">
              {dateWiseAttendanceLog.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('migrations')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeViewTab === 'migrations'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
            <span>Employees Transfer Trail</span>
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
              {workerMigrations.length}
            </span>
          </button>
        </div>

        {/* TAB 1: SITE BREAKDOWN WITH EXACT WORKING DATES & SALARY VS GIVEN */}
        {activeViewTab === 'sites' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Working Sites, Specific Working Dates &amp; Wage Settlement:</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {siteBreakdown.length} Site Work Records
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Working Project Site</th>
                      <th className="py-2.5 px-3.5">Working Dates in this Site</th>
                      <th className="py-2.5 px-3.5 text-center">Mandays</th>
                      <th className="py-2.5 px-3.5 text-right">Salary Earned (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Site Cash Given (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Net Site Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {siteBreakdown.map((item) => (
                      <tr key={item.siteId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900 align-top">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <span>{item.siteName}</span>
                            {item.isHomeSite && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                Home Site
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal block pl-5">
                            {item.siteCode} &bull; {item.location}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block pl-5 mt-0.5">
                            Trade: {item.sectionNames}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 align-top">
                          {item.datesWorked.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {item.datesWorked.map((dt) => (
                                  <span
                                    key={dt}
                                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.5 rounded"
                                  >
                                    <Calendar className="h-2.5 w-2.5 text-slate-500" />
                                    <span>{dt}</span>
                                  </span>
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {item.datesWorked.length} distinct day(s) on-site
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No duty dates logged</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center font-mono font-black text-blue-700 align-top">
                          <div>{item.totalMandays.toFixed(1)} d</div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({item.presentDays}P / {item.halfDays}H)
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 align-top">
                          ₹{item.grossWages.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-bold text-amber-700 align-top">
                          ₹{item.siteAmountsGiven.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-bold align-top">
                          {item.netSiteBalance > 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              +₹{item.netSiteBalance.toLocaleString('en-IN')} Due
                            </span>
                          ) : item.netSiteBalance === 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Fully Settled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              -₹{Math.abs(item.netSiteBalance).toLocaleString('en-IN')} Advance
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/90 font-bold text-slate-900 border-t border-slate-200 text-xs">
                      <td className="py-2.5 px-3.5" colSpan={2}>
                        Total Across All Sites
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono text-blue-800 font-black">
                        {totalMandays.toFixed(1)} Days
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-emerald-800 font-black">
                        ₹{totalGrossWages.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-amber-800 font-black">
                        ₹{totalSiteAmounts.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-indigo-900 font-black">
                        ₹{overallNetBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHRONOLOGICAL DATE-WISE ATTENDANCE & DISBURSEMENT LOG */}
        {activeViewTab === 'dates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Chronological Date-by-Date Attendance &amp; Site Cash Register:</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {dateWiseAttendanceLog.length} Shift Records
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Duty Date</th>
                      <th className="py-2.5 px-3.5">Working Site &amp; Section</th>
                      <th className="py-2.5 px-3.5 text-center">Status &amp; Method</th>
                      <th className="py-2.5 px-3.5 text-right">Day Wage Earned (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Site Cash Given (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Day Balance (₹)</th>
                      <th className="py-2.5 px-3.5">Disbursement Details / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dateWiseAttendanceLog.length > 0 ? (
                      dateWiseAttendanceLog.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {log.date}
                          </td>

                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-slate-800">{log.siteName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Section: {log.sectionName}
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  log.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.status === 'halfDay'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {log.status}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-0.5">
                                {log.method === 'face' ? (
                                  <>
                                    <Camera className="h-2.5 w-2.5 text-cyan-600" />
                                    <span>Face ID</span>
                                  </>
                                ) : log.method === 'fingerprint' ? (
                                  <>
                                    <Fingerprint className="h-2.5 w-2.5 text-purple-600" />
                                    <span>Fingerprint</span>
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-2.5 w-2.5 text-slate-500" />
                                    <span>Manual</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            ₹{log.dayWage.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                            {log.siteGiven > 0 ? (
                              <span>₹{log.siteGiven.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">₹0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3.5 text-right font-mono font-black whitespace-nowrap">
                            <span
                              className={
                                log.netDayBalance > 0
                                  ? 'text-indigo-700'
                                  : log.netDayBalance === 0
                                  ? 'text-slate-500'
                                  : 'text-amber-700'
                              }
                            >
                              ₹{log.netDayBalance.toLocaleString('en-IN')}
                            </span>
                          </td>

                          <td className="py-2.5 px-3.5 text-[11px] text-slate-600 max-w-[200px]">
                            {log.siteGiven > 0 && (
                              <span className="inline-block uppercase font-bold text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded mr-1">
                                {log.siteAmountMode || 'Cash'}
                              </span>
                            )}
                            <span>{log.siteAmountRemarks || log.remarks || '—'}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No date-wise attendance records found for this employee.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SITE MIGRATIONS & DISPATCHES HISTORY */}
        {activeViewTab === 'migrations' && (
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              <span>Employee Transfer Records (Site &amp; Section):</span>
            </h4>

            {workerMigrations.length > 0 ? (
              <div className="space-y-2">
                {workerMigrations.map((mig) => {
                  const fSite = sites.find((s) => s.id === mig.fromSiteId);
                  const tSite = sites.find((s) => s.id === mig.toSiteId);
                  const fSec = sections.find((s) => s.id === mig.fromSectionId);
                  const tSec = sections.find((s) => s.id === mig.toSectionId);

                  return (
                    <div
                      key={mig.id}
                      className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2 font-bold text-slate-900">
                          <span>
                            {fSite?.name || mig.fromSiteId}
                            {fSec ? ` (${fSec.name})` : ''}
                          </span>
                          <span className="text-indigo-600">&rarr;</span>
                          <span className="text-indigo-900">
                            {tSite?.name || mig.toSiteId}
                            {tSec ? ` (${tSec.name})` : ''}
                          </span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-black ${
                              mig.migrationType === 'permanent'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {mig.migrationType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Reason: <strong>{mig.reason}</strong> &bull; Effective: <strong>{mig.date}</strong> &bull; Approved By:{' '}
                          <strong>{mig.approvedBy}</strong>
                        </p>
                        {mig.remarks && <p className="text-[10px] text-slate-500 italic">{mig.remarks}</p>}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{mig.id}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs">
                No cross-site migrations recorded for this employee yet.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
export default WorkerMultiSiteSummaryModal;
