import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import {
  Printer,
  Download,
  DollarSign,
  CreditCard,
  CheckCircle2,
  FileText,
  Search,
  X,
  User,
} from 'lucide-react';
import type { MonthlySettlementRecord } from '../../types';
import { WorkforceWeeklySettlementModal } from '../../components/attendance/WorkforceWeeklySettlementModal';

export const MonthlySettlement: React.FC = () => {
  const {
    settlementRecords,
    workers,
    sites,
    sections,
    attendance,
    advances,
    recoveries,
    payments,
    updateSettlementStatus,
    currentUser,
  } = useAttendanceContext();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterSiteId, setFilterSiteId] = useState(
    currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : ''
  );
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchWorker, setSearchWorker] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected settlement record to display in the WorkforceWeeklySettlementModal
  const [selectedSettlementForModal, setSelectedSettlementForModal] =
    useState<MonthlySettlementRecord | null>(null);

  // Available sections based on selected site / supervisor
  const availableSections = sections.filter((sec) => {
    if (currentUser?.role === 'supervisor' && currentUser.assignedSiteId) {
      return sec.siteId === currentUser.assignedSiteId;
    }
    if (filterSiteId) {
      return sec.siteId === filterSiteId;
    }
    return true;
  });

  const displaySettlements = settlementRecords.filter((s) => {
    if (currentUser?.role === 'supervisor' && s.siteId !== currentUser?.assignedSiteId) return false;
    if (selectedMonth && s.month !== selectedMonth) return false;
    if (filterSiteId && s.siteId !== filterSiteId) return false;
    if (filterSectionId && s.sectionId !== filterSectionId) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;

    if (searchWorker.trim()) {
      const q = searchWorker.toLowerCase();
      const w = workers.find((wk) => wk.id === s.workerId);
      const nameMatch = w?.name.toLowerCase().includes(q);
      const idMatch = s.workerId.toLowerCase().includes(q);
      if (!nameMatch && !idMatch) return false;
    }
    return true;
  });

  const totalGross = displaySettlements.reduce((sum, s) => sum + s.grossWage, 0);
  const totalRecovery = displaySettlements.reduce((sum, s) => sum + s.advanceRecovery, 0);
  const totalNet = displaySettlements.reduce((sum, s) => sum + s.netPay, 0);
  const totalPaid = displaySettlements.filter((s) => s.status === 'paid').length;

  const handleAdvanceStatus = (record: MonthlySettlementRecord) => {
    let nextStatus: MonthlySettlementRecord['status'] = 'reviewed';
    if (record.status === 'draft') nextStatus = 'reviewed';
    else if (record.status === 'reviewed') nextStatus = 'approved';
    else if (record.status === 'approved') nextStatus = 'paid';

    updateSettlementStatus(record.id, nextStatus);
    setToastMessage(`Settlement ${record.id} status updated to ${nextStatus.toUpperCase()}.`);
  };

  const columns: Column<MonthlySettlementRecord>[] = [
    { header: 'S.No', render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span> },
    {
      header: 'Settlement ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.id}</span>,
    },
    {
      header: 'Worker Name & Serial',
      render: (row) => {
        const w = workers.find((wk) => wk.id === row.workerId);
        const s = sites.find((st) => st.id === row.siteId);
        const serial = `${s?.code || row.siteId}-${row.workerId}`;
        return (
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
              {w?.photoUrl ? (
                <img src={w.photoUrl} alt={w.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <div>
              <Link to={`/workers/${row.workerId}`} className="font-bold text-xs text-slate-900 hover:text-blue-600 block">
                {w?.name || row.workerId}
              </Link>
              <span className="block text-[11px] font-mono text-slate-500">{serial}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Site Location',
      render: (row) => {
        const site = sites.find((s) => s.id === row.siteId);
        const section = sections.find((sec) => sec.id === row.sectionId);
        return (
          <div>
            <span className="text-xs font-semibold text-slate-800 block">{site?.name || row.siteId}</span>
            <span className="text-[10px] text-slate-400">{section?.name || 'Section'}</span>
          </div>
        );
      },
    },
    {
      header: 'Days (P / H / A)',
      render: (row) => (
        <span className="text-xs font-bold">
          <span className="text-emerald-600">{row.presentDays}P</span> /{' '}
          <span className="text-amber-600">{row.halfDays}H</span> /{' '}
          <span className="text-rose-500">{row.absentDays}A</span>
        </span>
      ),
    },
    {
      header: 'Gross Wage',
      render: (row) => <span className="font-bold text-xs text-slate-900 font-mono">â‚¹{row.grossWage.toLocaleString()}</span>,
    },
    {
      header: 'Advance Recovery',
      render: (row) => (
        <span className={`font-bold text-xs font-mono ${row.advanceRecovery > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {row.advanceRecovery > 0 ? `-â‚¹${row.advanceRecovery.toLocaleString()}` : 'â‚¹0'}
        </span>
      ),
    },
    {
      header: 'Net Payable',
      render: (row) => <span className="font-black text-xs text-emerald-700 font-mono">â‚¹{row.netPay.toLocaleString()}</span>,
    },
    {
      header: 'Outstanding Adv.',
      render: (row) => (
        <span className={`font-bold text-xs font-mono ${row.outstandingAdvance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          â‚¹{row.outstandingAdvance.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Approval Pipeline',
      render: (row) => {
        const isReviewed = row.status === 'reviewed';
        const isApproved = row.status === 'approved';
        const isPaid = row.status === 'paid';

        return (
          <div className="space-y-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider block text-center ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isApproved
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : isReviewed
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {row.status}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Weekly Summary & Slip',
      render: (row) => (
        <button
          onClick={() => setSelectedSettlementForModal(row)}
          className="px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg inline-flex items-center space-x-1 transition-all shadow-2xs"
          title="Open Weekly Summary, Attendance Dates, Advance Log & Settlement Slip"
        >
          <FileText className="h-3.5 w-3.5 text-blue-600" />
          <span>Weekly Slip</span>
        </button>
      ),
    },
    {
      header: 'Action',
      render: (row) => {
        if (row.status === 'paid') {
          return (
            <span className="text-xs text-emerald-600 font-bold flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Settled</span>
            </span>
          );
        }

        const nextActionLabel =
          row.status === 'draft' ? 'Mark Reviewed' : row.status === 'reviewed' ? 'Approve Bill' : 'Clear Payout';

        return (
          <button
            onClick={() => handleAdvanceStatus(row)}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            {nextActionLabel}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Billing & Settlement</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Consolidated monthly labor muster: Draft &rarr; Reviewed &rarr; Approved &rarr; Paid audit workflow with weekly breakdown slips.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center space-x-1.5 transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Master</span>
          </button>
          <button
            onClick={() => alert('Exporting monthly settlement master to Excel (.xlsx)...')}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Master Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Wages"
          value={`â‚¹${totalGross.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          description={`Month: ${selectedMonth}`}
        />
        <StatCard
          title="Advance Deductions"
          value={`-â‚¹${totalRecovery.toLocaleString()}`}
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
          description="Total recovered"
        />
        <StatCard
          title="Net Disbursable"
          value={`â‚¹${totalNet.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          description="Net payable pool"
        />
        <StatCard
          title="Settled Profiles"
          value={`${totalPaid} of ${displaySettlements.length}`}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
          description="Paid status"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Billing Month */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          />
        </div>

        {/* Project Site (if admin) */}
        {currentUser?.role === 'admin' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Site</label>
            <select
              value={filterSiteId}
              onChange={(e) => {
                setFilterSiteId(e.target.value);
                setFilterSectionId('');
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
          </div>
        )}

        {/* Section Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Section</label>
          <select
            value={filterSectionId}
            onChange={(e) => setFilterSectionId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Sections</option>
            {availableSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name} ({sec.code})
              </option>
            ))}
          </select>
        </div>

        {/* Workflow Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Workflow Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Search Worker Input */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Search Workforce
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search worker name or ID..."
              value={searchWorker}
              onChange={(e) => setSearchWorker(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchWorker && (
              <button
                type="button"
                onClick={() => setSearchWorker('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Consolidated Master Table */}
      <DataTable
        columns={columns}
        data={displaySettlements}
        emptyTitle="No settlement records for selected period"
        emptyDescription="Please check your filter criteria or select another billing month."
      />

      {/* =========================================================================
          WORKFORCE WEEKLY SUMMARY & SETTLEMENT SLIP MODAL
         ========================================================================= */}
      {selectedSettlementForModal && (
        <WorkforceWeeklySettlementModal
          isOpen={Boolean(selectedSettlementForModal)}
          onClose={() => setSelectedSettlementForModal(null)}
          settlement={selectedSettlementForModal}
          worker={
            workers.find((w) => w.id === selectedSettlementForModal.workerId) || workers[0]
          }
          site={sites.find((s) => s.id === selectedSettlementForModal.siteId)}
          sites={sites}
          section={sections.find((sec) => sec.id === selectedSettlementForModal.sectionId)}
          month={selectedSettlementForModal.month || selectedMonth}
          allAttendance={attendance}
          allAdvances={advances}
          allRecoveries={recoveries}
          allPayments={payments}
          supervisorName={currentUser?.name || 'Site Supervisor'}
          onSuccessToast={(msg) => setToastMessage(msg)}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default MonthlySettlement;

