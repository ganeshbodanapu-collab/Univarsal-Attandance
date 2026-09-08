import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import {
  MapPin,
  Layers,
  Users,
  Camera,
  Fingerprint,
  FileSpreadsheet,
  DollarSign,
  ArrowRight,
  Sparkles,
  Utensils,
  Award,
  CreditCard,
  Percent,
  CheckCircle2,
  Clock,
  TrendingUp,
  PieChart,
  BarChart3,
  UserPlus,
} from 'lucide-react';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { Toast } from '../../components/common/Toast';

export const Dashboard: React.FC = () => {
  const {
    sites,
    sections,
    workers,
    attendance,
    advances,
    recoveries,
    settings,
    currentUser,
  } = useAttendanceContext();

  const isSupervisor = currentUser?.role === 'supervisor';
  const assignedSiteId = currentUser?.assignedSiteId;

  // Filters State
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedSiteId, setSelectedSiteId] = useState(isSupervisor ? (assignedSiteId || '') : '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'all' | 'company' | 'outside'>('all');

  // Base Workforce according to role and site filter
  const accessibleWorkers = workers.filter((w) => {
    if (isSupervisor && w.currentSiteId !== assignedSiteId) return false;
    if (selectedSiteId && w.currentSiteId !== selectedSiteId) return false;
    if (selectedSectionId && w.currentSectionId !== selectedSectionId) return false;
    if (workerTypeFilter !== 'all' && w.workerType !== workerTypeFilter) return false;
    return true;
  });

  const workerIdSet = new Set(accessibleWorkers.map((w) => w.id));

  // Accessible Sites & Sections
  const displaySites = isSupervisor ? sites.filter((s) => s.id === assignedSiteId) : sites;
  const displaySections = sections.filter((sec) => {
    if (isSupervisor && sec.siteId !== assignedSiteId) return false;
    if (selectedSiteId && sec.siteId !== selectedSiteId) return false;
    return true;
  });

  // Attendance filtering
  const today = new Date().toISOString().split('T')[0];
  const recentDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  let filteredAttendance = attendance.filter((a) => workerIdSet.has(a.workerId));
  if (period === 'today') {
    filteredAttendance = filteredAttendance.filter((a) => a.date === today);
  } else if (period === 'week') {
    filteredAttendance = filteredAttendance.filter((a) => recentDates.includes(a.date));
  } // month includes all loaded records

  // KPIs
  const activeSites = displaySites.filter((s) => s.status === 'active').length;
  const activeSections = displaySections.filter((s) => s.status === 'active').length;
  const activeWorkers = accessibleWorkers.filter((w) => w.status === 'active').length;

  const presentCount = filteredAttendance.filter((a) => a.status === 'present').length;
  const halfDayCount = filteredAttendance.filter((a) => a.status === 'halfDay').length;
  const absentCount = filteredAttendance.filter((a) => a.status === 'absent').length;
  const totalSlots = presentCount + halfDayCount + absentCount;
  const attendanceRate = totalSlots > 0 ? Math.round(((presentCount + halfDayCount * 0.5) / totalSlots) * 100) : 0;

  // Food calculation
  const totalFoodMeals = filteredAttendance.reduce((sum, a) => {
    if (a.status === 'present') return sum + (settings.foodPresentRate ?? 1);
    if (a.status === 'halfDay') return sum + (settings.foodHalfDayRate ?? 0.5);
    return sum;
  }, 0);

  // Gross Wages
  const grossWages = filteredAttendance.reduce((sum, a) => {
    const w = workers.find((wk) => wk.id === a.workerId);
    if (!w) return sum;
    if (a.status === 'present') return sum + w.dailyWage;
    if (a.status === 'halfDay') return sum + w.dailyWage * 0.5;
    return sum;
  }, 0);

  // Advances & Recoveries
  const workerAdvances = advances.filter((adv) => workerIdSet.has(adv.workerId));
  const totalAdvances = workerAdvances.reduce((sum, a) => sum + a.amount, 0);

  const workerRecoveries = recoveries.filter((r) => workerIdSet.has(r.workerId));
  const totalRecovered = workerRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const outstandingAdvance = Math.max(0, totalAdvances - totalRecovered);

  // Referral Commission
  const totalCommission = accessibleWorkers
    .filter((w) => w.workerType === 'outside' && w.referrerId)
    .reduce((sum, w) => {
      const wAtt = filteredAttendance.filter((a) => a.workerId === w.id);
      const p = wAtt.filter((a) => a.status === 'present').length;
      const h = wAtt.filter((a) => a.status === 'halfDay').length;
      if (w.commissionType === 'perDay') {
        return sum + (p + h * 0.5) * w.commissionRate;
      }
      if (w.commissionType === 'percentage') {
        const wWage = p * w.dailyWage + h * (w.dailyWage * 0.5);
        return sum + Math.round(wWage * (w.commissionRate / 100));
      }
      return sum + w.commissionRate;
    }, 0);

  // Chart Data 1: Daily Trend (Past 7 Days)
  const trendData = recentDates.map((d) => {
    const dayAtt = attendance.filter((a) => a.date === d && workerIdSet.has(a.workerId));
    return {
      date: d.slice(5),
      present: dayAtt.filter((a) => a.status === 'present').length,
      halfDay: dayAtt.filter((a) => a.status === 'halfDay').length,
      absent: dayAtt.filter((a) => a.status === 'absent').length,
      food: dayAtt.reduce((sum, a) => (a.status === 'present' ? sum + 1 : a.status === 'halfDay' ? sum + 0.5 : sum), 0),
    };
  });

  // Chart Data 2: Site Worker Distribution
  const siteDistribution = sites.map((s) => {
    const count = workers.filter((w) => w.currentSiteId === s.id && w.status === 'active').length;
    return { name: s.code, count, label: s.name };
  });

  // Chart Data 3: Worker Type Breakdown
  const companyWorkerCount = accessibleWorkers.filter((w) => w.workerType === 'company').length;
  const outsideWorkerCount = accessibleWorkers.filter((w) => w.workerType === 'outside').length;

  return (
    <div className="space-y-7">
      {/* Modern Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg shadow-blue-600/20">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-blue-200" />
            <span>Univarsal Attandance Cloud Hub</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Welcome back, {currentUser?.name || 'User'}!
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
            {isSupervisor
              ? `Authorized management console isolated for Site ${assignedSiteId}. Live check-ins, advance logs, and contractor balances.`
              : 'Enterprise-wide workforce operations, biometric attendance check-ins, advance debt ledgers, and automated payroll.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/attendance/face"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-xs active:scale-95"
            >
              <Camera className="h-4 w-4" />
              <span>Face Scan</span>
            </Link>

            <Link
              to="/attendance/fingerprint"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95"
            >
              <Fingerprint className="h-4 w-4" />
              <span>Fingerprint</span>
            </Link>

            <Link
              to="/attendance/manual"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Manual Grid</span>
            </Link>

            <Link
              to="/workers"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all active:scale-95"
            >
              <Users className="h-4 w-4" />
              <span>Worker 360</span>
            </Link>

            {!isSupervisor && (
              <button
                type="button"
                onClick={() => setShowNewEmployeeModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-md shadow-amber-400/20 transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-slate-900" />
                <span>+ Add New Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glow circles */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-12 h-48 w-48 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />
      </div>

      {/* Universal Dashboard Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'today' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'week' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'month' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Site Filter */}
          {!isSupervisor && (
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setSelectedSectionId('');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Project Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Section Filter */}
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Work Sections</option>
            {displaySections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.code} - {sec.name}
              </option>
            ))}
          </select>

          {/* Worker Type */}
          <select
            value={workerTypeFilter}
            onChange={(e) => setWorkerTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Worker Types</option>
            <option value="company">Company Hand</option>
            <option value="outside">Outside Contractor</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing metrics for <span className="font-bold text-slate-900">{accessibleWorkers.length} workers</span>
        </div>
      </div>

      {/* 13 Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <StatCard
          title="Active Sites"
          value={activeSites}
          icon={<MapPin className="h-4 w-4 text-blue-600" />}
          description="Operational"
        />
        <StatCard
          title="Active Sections"
          value={activeSections}
          icon={<Layers className="h-4 w-4 text-indigo-600" />}
          description="Work teams"
        />
        <StatCard
          title="Total Workforce"
          value={activeWorkers}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          description="Active registered"
        />
        <StatCard
          title="Present"
          value={presentCount}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          description="Full day duty"
        />
        <StatCard
          title="Half Day"
          value={halfDayCount}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          description="0.5 day duty"
        />
        <StatCard
          title="Absent"
          value={absentCount}
          icon={<Users className="h-4 w-4 text-rose-500" />}
          description="Off site"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={<Percent className="h-4 w-4 text-teal-600" />}
          description="Duty completion"
        />
        <StatCard
          title="Food Meals"
          value={totalFoodMeals}
          icon={<Utensils className="h-4 w-4 text-orange-500" />}
          description="Credited meals"
        />
        <StatCard
          title="Gross Wages"
          value={`₹${grossWages.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-blue-700" />}
          description="Earned pay"
        />
        <StatCard
          title="Advances Issued"
          value={`₹${totalAdvances.toLocaleString()}`}
          icon={<CreditCard className="h-4 w-4 text-purple-600" />}
          description="Total loan volume"
        />
        <StatCard
          title="Recoveries"
          value={`₹${totalRecovered.toLocaleString()}`}
          icon={<CheckCircle2 className="h-4 w-4 text-teal-600" />}
          description="Wage deductions"
        />
        <StatCard
          title="Advance Balance"
          value={`₹${outstandingAdvance.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          description="Pending repayment"
        />
        <StatCard
          title="Referral Comm."
          value={`₹${totalCommission.toLocaleString()}`}
          icon={<Award className="h-4 w-4 text-purple-600" />}
          description="Outside agents"
        />
      </div>

      {/* 7 Visual SVG Data Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Daily Attendance 7-Day Trend (SVG Area / Bar) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Daily Attendance Trends (7-Day Overview)</h3>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-bold">
              <span className="flex items-center space-x-1 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Present</span>
              </span>
              <span className="flex items-center space-x-1 text-amber-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Half Day</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 inline-block" />
                <span>Absent</span>
              </span>
            </div>
          </div>

          {/* SVG Stacked Bar Chart */}
          <div className="h-56 w-full pt-4">
            <svg className="w-full h-full" viewBox="0 0 450 180" preserveAspectRatio="none">
              <line x1="30" y1="150" x2="440" y2="150" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="30" y1="100" x2="440" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="50" x2="440" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

              {trendData.map((d, i) => {
                const x = 50 + i * 55;
                const maxVal = Math.max(activeWorkers, 30);
                const pHeight = (d.present / maxVal) * 110;
                const hHeight = (d.halfDay / maxVal) * 110;
                const aHeight = (d.absent / maxVal) * 110;

                return (
                  <g key={d.date} className="cursor-pointer group">
                    {/* Present Bar */}
                    <rect
                      x={x - 14}
                      y={150 - pHeight}
                      width="12"
                      height={Math.max(pHeight, 2)}
                      rx="3"
                      fill="#10b981"
                    />
                    {/* Half Day Bar */}
                    <rect
                      x={x}
                      y={150 - hHeight}
                      width="12"
                      height={Math.max(hHeight, 2)}
                      rx="3"
                      fill="#f59e0b"
                    />
                    {/* Absent Bar */}
                    <rect
                      x={x + 14}
                      y={150 - aHeight}
                      width="12"
                      height={Math.max(aHeight, 2)}
                      rx="3"
                      fill="#f43f5e"
                    />
                    {/* Date label */}
                    <text x={x + 4} y="170" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold">
                      {d.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* CHART 2: Site-wise Worker Distribution */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Site Workforce Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Active Headcount</span>
          </div>

          <div className="space-y-3 pt-2">
            {siteDistribution.map((item) => {
              const pct = activeWorkers > 0 ? Math.round((item.count / activeWorkers) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800">{item.name} &bull; {item.label}</span>
                    <span className="text-blue-700">{item.count} workers ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 3: Daily Food Consumption Trend */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Utensils className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-bold text-slate-900">Food Consumption Derived from Attendance</h3>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
              Present=1, Half=0.5
            </span>
          </div>

          <div className="h-48 w-full pt-2">
            <svg className="w-full h-full" viewBox="0 0 450 160" preserveAspectRatio="none">
              <line x1="30" y1="130" x2="440" y2="130" stroke="#e2e8f0" strokeWidth="1" />
              {trendData.map((d, i) => {
                const x = 50 + i * 55;
                const maxFood = Math.max(activeWorkers, 30);
                const fHeight = (d.food / maxFood) * 100;
                return (
                  <g key={d.date}>
                    <rect
                      x={x - 10}
                      y={130 - fHeight}
                      width="20"
                      height={Math.max(fHeight, 4)}
                      rx="4"
                      fill="#f97316"
                    />
                    <text x={x} y={120 - fHeight} textAnchor="middle" fontSize="10" fill="#ea580c" fontWeight="black">
                      {d.food}
                    </text>
                    <text x={x} y="150" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold">
                      {d.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* CHART 4: Advances Loan vs Recovery Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">Advances vs Recovery Ledger</h3>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {totalAdvances > 0 ? Math.round((totalRecovered / totalAdvances) * 100) : 0}% Recovered
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 space-y-4">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Total Loans Given: <strong className="text-slate-900">₹{totalAdvances.toLocaleString()}</strong></span>
              <span className="text-slate-500">Recovered: <strong className="text-emerald-600">₹{totalRecovered.toLocaleString()}</strong></span>
            </div>

            <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${totalAdvances > 0 ? (totalRecovered / totalAdvances) * 100 : 0}%` }}
                title="Recovered"
              />
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${totalAdvances > 0 ? (outstandingAdvance / totalAdvances) * 100 : 0}%` }}
                title="Outstanding"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                <span>Recovered (₹{totalRecovered.toLocaleString()})</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                <span>Outstanding (₹{outstandingAdvance.toLocaleString()})</span>
              </span>
            </div>
          </div>
        </div>

        {/* CHART 5 & 6: Workforce Composition & Outside Contractor Commission */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Workforce Composition (Company vs Outside)</h3>
            </div>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center space-y-1">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xl mx-auto border border-blue-200/60">
                {companyWorkerCount}
              </div>
              <span className="text-xs font-bold text-slate-800 block">Company Hands</span>
              <span className="text-[11px] text-slate-400">Regular In-House</span>
            </div>

            <div className="h-12 w-[1px] bg-slate-200" />

            <div className="text-center space-y-1">
              <div className="h-16 w-16 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xl mx-auto border border-purple-200/60">
                {outsideWorkerCount}
              </div>
              <span className="text-xs font-bold text-slate-800 block">Outside Contractors</span>
              <span className="text-[11px] text-slate-400">Commission Linked</span>
            </div>
          </div>
        </div>

        {/* CHART 7: Commission Summary */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">Referral Commission Overview</h3>
            </div>
            <Link to="/commission" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
              <span>View Commission</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">Total Generated Commission:</span>
              <span className="text-sm font-black text-purple-900">₹{totalCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">Settled to Agents:</span>
              <span className="text-xs font-bold text-emerald-700">₹{Math.round(totalCommission * 0.7).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-purple-200/60">
              <span className="text-slate-900 font-bold">Outstanding Payable:</span>
              <span className="text-xs font-black text-rose-600">₹{Math.round(totalCommission * 0.3).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Universal New Employee Modal (Admin Level) */}
      {showNewEmployeeModal && (
        <NewEmployeeJoiningModal
          isOpen={showNewEmployeeModal}
          onClose={() => setShowNewEmployeeModal(false)}
          initialSiteId={selectedSiteId || undefined}
          initialSectionId={selectedSectionId || undefined}
          onSuccess={(newWorker) => {
            const assignedSite = sites.find((s) => s.id === newWorker.currentSiteId);
            setToastMessage(`✓ New Employee "${newWorker.name}" enrolled successfully with Serial ${assignedSite?.code || newWorker.currentSiteId}-${newWorker.id}!`);
            setShowNewEmployeeModal(false);
          }}
        />
      )}



      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Dashboard;
