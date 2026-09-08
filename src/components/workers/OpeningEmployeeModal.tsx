import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker, WorkerOpeningRecord } from '../../types';
import { Modal } from '../common/Modal';
import {
  Calendar,
  DollarSign,
  Clock,
  Utensils,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
} from 'lucide-react';

interface OpeningEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker?: Worker | null;
  onSuccess?: (workerId: string) => void;
  onSwitchToCreate?: () => void;
  onEditWorker?: (worker: Worker) => void;
  onDeleteWorker?: (worker: Worker) => void;
}

export const OpeningEmployeeModal: React.FC<OpeningEmployeeModalProps> = ({
  isOpen,
  onClose,
  worker: initialWorker,
  onSuccess,
  onSwitchToCreate,
  onEditWorker,
  onDeleteWorker,
}) => {
  const { workers, sites, sections, updateWorkerOpening, currentUser } = useAttendanceContext();

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(initialWorker?.id || '');
  const activeWorker = workers.find((w) => w.id === selectedWorkerId) || initialWorker || null;

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = `${todayStr.slice(0, 7)}-01`;
  const [originalJoiningDate, setOriginalJoiningDate] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>(firstOfMonthStr);
  const [priorWorkingDays, setPriorWorkingDays] = useState<string>('0');
  const [priorHalfDays, setPriorHalfDays] = useState<string>('0');
  const [priorEarnedWages, setPriorEarnedWages] = useState<string>('0');
  const [isWagesManual, setIsWagesManual] = useState<boolean>(false);
  const [openingAdvanceBalance, setOpeningAdvanceBalance] = useState<string>('0');
  const [openingPendingWages, setOpeningPendingWages] = useState<string>('0');
  const [openingFoodMeals, setOpeningFoodMeals] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize or populate from existing openingRecord
  useEffect(() => {
    if (activeWorker) {
      setSelectedWorkerId(activeWorker.id);
      const rec = activeWorker.openingRecord;
      if (rec) {
        setOriginalJoiningDate(rec.originalJoiningDate || activeWorker.joiningDate);
        setAsOfDate(rec.asOfDate || firstOfMonthStr);
        setPriorWorkingDays(String(rec.priorWorkingDays || 0));
        setPriorHalfDays(String(rec.priorHalfDays || 0));
        setPriorEarnedWages(String(rec.priorEarnedWages || 0));
        setIsWagesManual(true);
        setOpeningAdvanceBalance(String(rec.openingAdvanceBalance || 0));
        setOpeningPendingWages(String(rec.openingPendingWages || 0));
        setOpeningFoodMeals(String(rec.openingFoodMeals || 0));
        setRemarks(rec.remarks || '');
      } else {
        setOriginalJoiningDate(activeWorker.joiningDate || todayStr);
        setAsOfDate(firstOfMonthStr);
        setPriorWorkingDays('0');
        setPriorHalfDays('0');
        setPriorEarnedWages('0');
        setIsWagesManual(false);
        setOpeningAdvanceBalance('0');
        setOpeningPendingWages('0');
        setOpeningFoodMeals('0');
        setRemarks('');
      }
      setValidationError(null);
    }
  }, [activeWorker, isOpen]);

  // Derived calculation values
  const fullDaysNum = Math.max(0, parseFloat(priorWorkingDays) || 0);
  const halfDaysNum = Math.max(0, parseFloat(priorHalfDays) || 0);
  const totalMandays = fullDaysNum + halfDaysNum * 0.5;

  const dailyWage = activeWorker?.dailyWage || 500;
  const autoCalculatedWages = Math.round(totalMandays * dailyWage);

  // Keep wages synced if not overridden manually
  useEffect(() => {
    if (!isWagesManual && activeWorker) {
      setPriorEarnedWages(String(autoCalculatedWages));
    }
  }, [autoCalculatedWages, isWagesManual, activeWorker]);

  const advanceNum = Math.max(0, parseFloat(openingAdvanceBalance) || 0);
  const pendingWageNum = Math.max(0, parseFloat(openingPendingWages) || 0);
  const netOpeningBalance = pendingWageNum - advanceNum;

  const currentSite = sites.find((s) => s.id === activeWorker?.currentSiteId);
  const currentSection = sections.find((s) => s.id === activeWorker?.currentSectionId);

  const handleSave = () => {
    if (!activeWorker) {
      setValidationError('Please select an employee first.');
      return;
    }

    if (!originalJoiningDate) {
      setValidationError('Please specify the employee original joining date.');
      return;
    }

    if (!asOfDate) {
      setValidationError('Please specify the cutover opening As-Of date.');
      return;
    }

    if (originalJoiningDate > asOfDate) {
      setValidationError('Original joining date cannot be after the Opening As-Of date.');
      return;
    }

    const earnedWagesNum = parseFloat(priorEarnedWages) || autoCalculatedWages;
    const foodMealsNum = Math.max(0, parseFloat(openingFoodMeals) || 0);

    const record: WorkerOpeningRecord = {
      workerId: activeWorker.id,
      originalJoiningDate,
      asOfDate,
      priorWorkingDays: fullDaysNum,
      priorHalfDays: halfDaysNum,
      totalPriorDays: totalMandays,
      priorEarnedWages: earnedWagesNum,
      openingAdvanceBalance: advanceNum,
      openingPendingWages: pendingWageNum,
      netOpeningBalance,
      openingFoodMeals: foodMealsNum,
      remarks: remarks.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Admin',
    };

    updateWorkerOpening(activeWorker.id, record);
    if (onSuccess) {
      onSuccess(activeWorker.id);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Opening Balance & Prior Service Entry"
      subtitle="Configure historical joining date, prior working days before digital cutoff, old advances, and unpaid wages (Admin Control)."
      size="xl"
      icon={<BookOpen className="h-5 w-5 text-indigo-600" />}
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center space-x-2">
            {activeWorker && onEditWorker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditWorker(activeWorker);
                }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Edit Employee Personal Details, Daily Wage, Site & Section"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                <span>Edit Employee Data</span>
              </button>
            )}

            {activeWorker && onDeleteWorker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteWorker(activeWorker);
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Delete Employee Permanently"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Delete Employee</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Opening Record</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 py-1">
        {/* Validation Warning Alert */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 1. Worker Selection Card */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Select Employee / Worker *
            </label>
            <div className="flex items-center space-x-2">
              {activeWorker?.openingRecord && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ Opening Already Configured
                </span>
              )}
              {onSwitchToCreate && (
                <button
                  type="button"
                  onClick={onSwitchToCreate}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  + Register Brand New Opening Employee
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-8">
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Choose Employee ({workers.length} registered) --</option>
                {workers.map((w) => {
                  const s = sites.find((st) => st.id === w.currentSiteId);
                  const sec = sections.find((sc) => sc.id === w.currentSectionId);
                  const isDone = !!w.openingRecord;
                  return (
                    <option key={w.id} value={w.id}>
                      {isDone ? '✓ ' : '• '} {w.name} ({w.id}) | {s?.name || 'Unassigned'} - {sec?.name || 'Unassigned'} | ₹{w.dailyWage}/day
                    </option>
                  );
                })}
              </select>
            </div>

            {activeWorker && (
              <div className="sm:col-span-4 bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm shrink-0">
                  {activeWorker.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{activeWorker.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono font-medium">
                    Rate: ₹{activeWorker.dailyWage}/day • {currentSite?.code || 'Site'} - {currentSection?.code || 'Sec'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Dates Section */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>2. Historical Joining &amp; Opening As-Of Cutover Date</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Original Joining Date with Company / Contractor *
              </label>
              <input
                type="date"
                value={originalJoiningDate}
                onChange={(e) => setOriginalJoiningDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                The actual date the worker originally began service with the firm.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opening As-Of Date (Cutover Date) *
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                All prior days and old amounts up to this date are migrated as opening.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Prior Working Days & Earned Wages */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>3. Prior Working Days Entry (Historical Muster)</span>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Calculated Mandays: {totalMandays} Days
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prior Full Working Days
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={priorWorkingDays}
                onChange={(e) => setPriorWorkingDays(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Full 1.0 day attendance</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prior Half Duty Days
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={priorHalfDays}
                onChange={(e) => setPriorHalfDays(e.target.value)}
                placeholder="e.g. 8"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Half 0.5 day duty</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Prior Earned Wages (₹)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsWagesManual(false);
                    setPriorEarnedWages(String(autoCalculatedWages));
                  }}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  Auto: ₹{autoCalculatedWages}
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={priorEarnedWages}
                onChange={(e) => {
                  setIsWagesManual(true);
                  setPriorEarnedWages(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {totalMandays} days × ₹{dailyWage} = ₹{autoCalculatedWages}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Old Amounts / Advances & Pending Wages */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>4. Workers Old Amount &amp; Opening Financial Balances</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-1.5">
              <label className="block text-xs font-black text-rose-900">
                Old Advance Loan Balance Outstanding (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={openingAdvanceBalance}
                onChange={(e) => setOpeningAdvanceBalance(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-black text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[11px] text-rose-700/80 leading-relaxed">
                Money previously borrowed by the worker before this digital system. Carried forward for recovery.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1.5">
              <label className="block text-xs font-black text-emerald-900">
                Old Pending / Unpaid Wages Due (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={openingPendingWages}
                onChange={(e) => setOpeningPendingWages(e.target.value)}
                placeholder="e.g. 3500"
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                Past wages already earned in previous months that have not yet been disbursed to the worker.
              </p>
            </div>
          </div>

          {/* Live Net Position Calculator Banner */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-lg ${
                  netOpeningBalance > 0
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : netOpeningBalance < 0
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                ₹
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Opening Balance (Pending Wages - Old Advance)
                </span>
                <span className="text-sm font-black tracking-tight">
                  {netOpeningBalance > 0
                    ? `+₹${netOpeningBalance.toLocaleString()} (Company Owes Worker • Credit)`
                    : netOpeningBalance < 0
                    ? `-₹${Math.abs(netOpeningBalance).toLocaleString()} (Worker Owes Company • Debit)`
                    : '₹0.00 (Balanced / Even)'}
                </span>
              </div>
            </div>

            <span
              className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                netOpeningBalance > 0
                  ? 'bg-emerald-500 text-slate-950'
                  : netOpeningBalance < 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {netOpeningBalance > 0 ? 'NET PAYABLE' : netOpeningBalance < 0 ? 'NET RECOVERABLE' : 'BALANCED'}
            </span>
          </div>
        </div>

        {/* 5. Food & Welfare & Ledger Reference */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Utensils className="h-3.5 w-3.5 text-orange-600" />
                <span>Prior Canteen Meals Count</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={openingFoodMeals}
                onChange={(e) => setOpeningFoodMeals(e.target.value)}
                placeholder="e.g. 90"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Historical meal count</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                <span>Ledger Register Book Reference &amp; Audit Notes</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Carried forward from Manual Ledger 2025-26, Page 42. Verified by Site In-charge."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Official audit trail reference for physical binder / ledger cross-checking.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OpeningEmployeeModal;
