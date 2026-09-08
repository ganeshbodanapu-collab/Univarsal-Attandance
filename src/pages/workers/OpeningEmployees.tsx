import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { OpeningEmployeeModal } from '../../components/workers/OpeningEmployeeModal';
import { CreateOpeningEmployeeModal } from '../../components/workers/CreateOpeningEmployeeModal';
import { EditEmployeeModal } from '../../components/sections/EditEmployeeModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  DollarSign,
  Clock,
  Search,
  CheckCircle2,
  Edit3,
  Trash2,
  Wallet,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  UserPlus,
} from 'lucide-react';

export const OpeningEmployees: React.FC = () => {
  const navigate = useNavigate();
  const { workers, sites, sections, currentUser, deleteWorker } = useAttendanceContext();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters State
  const [filterSiteId, setFilterSiteId] = useState<string>('');
  const [filterSectionId, setFilterSectionId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'configured' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState<boolean>(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Guard: Admin Only
  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Access Required</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          The <strong>Opening Employees &amp; Prior Ledger Hub</strong> is strictly restricted to Central Administrators.
          Site supervisors do not have clearance to modify opening records or historical wage balances.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Filtered workers
  const filteredWorkers = workers.filter((w) => {
    if (filterSiteId && w.currentSiteId !== filterSiteId) return false;
    if (filterSectionId && w.currentSectionId !== filterSectionId) return false;

    const hasOpening = !!w.openingRecord;
    if (filterStatus === 'configured' && !hasOpening) return false;
    if (filterStatus === 'pending' && hasOpening) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const s = sites.find((site) => site.id === w.currentSiteId);
      const serial = `${s?.code || w.currentSiteId}-${w.id}`.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q);
      const matchId = w.id.toLowerCase().includes(q);
      const matchSerial = serial.includes(q);
      const matchMobile = w.mobile.includes(q);
      return matchName || matchId || matchSerial || matchMobile;
    }
    return true;
  });

  // KPI Calculations across all workers or filtered set
  const totalWorkers = workers.length;
  const configuredCount = workers.filter((w) => !!w.openingRecord).length;
  const pendingCount = totalWorkers - configuredCount;

  const totalOldAdvances = workers.reduce(
    (sum, w) => sum + (w.openingRecord?.openingAdvanceBalance || 0),
    0
  );
  const totalOldPendingWages = workers.reduce(
    (sum, w) => sum + (w.openingRecord?.openingPendingWages || 0),
    0
  );
  const netOpeningTotal = totalOldPendingWages - totalOldAdvances;

  const totalPriorDays = workers.reduce(
    (sum, w) => sum + (w.openingRecord?.totalPriorDays || 0),
    0
  );

  const availableSections = filterSiteId
    ? sections.filter((s) => s.siteId === filterSiteId)
    : sections;

  const columns: Column<Worker>[] = [
    {
      header: 'S.No',
      render: (_, idx) => <span className="text-xs text-slate-400 font-semibold">{idx + 1}</span>,
    },
    {
      header: 'Serial No',
      render: (row) => {
        const s = sites.find((site) => site.id === row.currentSiteId);
        const serial = row.serialNumber || (row.id.startsWith('W') ? `${s?.code || row.currentSiteId}-${row.id}` : row.id);
        return (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {serial}
          </span>
        );
      },
    },
    {
      header: 'Employee ID & Name',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={`/workers/${row.id}`}
            className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors block"
          >
            {row.name}
          </Link>
          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/50">
            {row.id}
          </span>
        </div>
      ),
    },
    {
      header: 'Site & Section',
      render: (row) => {
        const site = sites.find((s) => s.id === row.currentSiteId);
        const sec = sections.find((s) => s.id === row.currentSectionId);
        return (
          <div>
            <div className="text-xs font-semibold text-slate-800">{site?.name || 'Unassigned'}</div>
            <div className="text-[11px] text-slate-500">{sec?.name || 'Unassigned'}</div>
          </div>
        );
      },
    },
    {
      header: 'Original Joining',
      render: (row) => {
        const date = row.openingRecord?.originalJoiningDate || row.joiningDate;
        return (
          <div>
            <span className="text-xs font-bold text-slate-800">{date}</span>
            {row.openingRecord?.asOfDate && (
              <span className="block text-[10px] text-slate-400">
                As-Of: {row.openingRecord.asOfDate}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Prior Days',
      render: (row) => {
        const rec = row.openingRecord;
        if (!rec) {
          return <span className="text-xs text-slate-400 italic">Not entered</span>;
        }
        return (
          <div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {rec.totalPriorDays} Days
            </span>
            <span className="block text-[10px] text-slate-500 mt-0.5">
              {rec.priorWorkingDays} Full • {rec.priorHalfDays} Half
            </span>
          </div>
        );
      },
    },
    {
      header: 'Old Advance (Dr)',
      render: (row) => {
        const adv = row.openingRecord?.openingAdvanceBalance || 0;
        if (adv === 0) return <span className="text-xs text-slate-400 font-mono">₹0</span>;
        return (
          <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            ₹{adv.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Old Pending Wages (Cr)',
      render: (row) => {
        const due = row.openingRecord?.openingPendingWages || 0;
        if (due === 0) return <span className="text-xs text-slate-400 font-mono">₹0</span>;
        return (
          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ₹{due.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Net Opening Balance',
      render: (row) => {
        const rec = row.openingRecord;
        if (!rec) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Pending Setup
            </span>
          );
        }

        const net = rec.netOpeningBalance;
        if (net > 0) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              +₹{net.toLocaleString()} Payable
            </span>
          );
        } else if (net < 0) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
              -₹{Math.abs(net).toLocaleString()} Recoverable
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            ₹0 Balanced
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5 whitespace-nowrap">
          {/* Edit Employee Data (Name, Wage, Site, Section, Aadhaar) */}
          <button
            type="button"
            onClick={() => {
              setEditingWorker(row);
              setShowEditWorkerModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 transition-all flex items-center space-x-1 cursor-pointer active:scale-95 shadow-xs"
            title={`Edit ${row.name}'s data (Name, Wage, Site, Section, Aadhaar)`}
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-700" />
            <span>Edit</span>
          </button>

          {/* Edit Opening Balances & Advances */}
          <button
            type="button"
            onClick={() => {
              setSelectedWorker(row);
              setShowModal(true);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1 transition-all active:scale-95 cursor-pointer shadow-xs ${
              row.openingRecord
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={`Configure or Edit ${row.name}'s Opening Balances & Advances`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>{row.openingRecord ? 'Opening' : 'Set Opening'}</span>
          </button>

          {/* Delete Employee Permanently */}
          <button
            type="button"
            onClick={() => setWorkerToDelete(row)}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-300 transition-all flex items-center space-x-1 cursor-pointer active:scale-95 shadow-xs"
            title={`Delete ${row.name} from system`}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Admin Exclusive Console
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Historical Cutover</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Opening Employees &amp; Prior Ledger Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-3xl">
            Configure historical employee joining dates, prior working days before digital cutoff, old advance loans, and past pending wage arrears.
          </p>
        </div>

        <div className="flex items-center self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black inline-flex items-center space-x-2 shadow-md shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
            title="Register new opening employee with Face ID, Fingerprint, and Opening Balances"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add Opening Employee</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Configured Workers"
          value={`${configuredCount} / ${totalWorkers}`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          description={`${pendingCount} pending setup`}
        />
        <StatCard
          title="Prior Mandays Migrated"
          value={`${totalPriorDays} Days`}
          icon={<Clock className="h-5 w-5 text-indigo-600" />}
          description="Cumulative duty before cutoff"
        />
        <StatCard
          title="Old Advances Carried"
          value={`₹${totalOldAdvances.toLocaleString()}`}
          icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
          description="Total recoverable debt"
        />
        <StatCard
          title="Old Pending Wages"
          value={`₹${totalOldPendingWages.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          description="Unpaid historical dues"
        />
        <StatCard
          title="Net Opening Balance"
          value={`₹${Math.abs(netOpeningTotal).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-teal-600" />}
          description={
            netOpeningTotal > 0
              ? 'Net Payable to Workforce (Cr)'
              : netOpeningTotal < 0
              ? 'Net Recoverable from Workforce (Dr)'
              : 'Even / Balanced'
          }
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker name, employee ID, serial number, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
          </div>

          {/* Site Filter */}
          <div className="w-full md:w-56">
            <select
              value={filterSiteId}
              onChange={(e) => {
                setFilterSiteId(e.target.value);
                setFilterSectionId('');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Project Sites ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="w-full md:w-56">
            <select
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              disabled={!filterSiteId && sections.length > 10}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
            >
              <option value="">All Trade Sections</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.code} - {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Status: All Workers</option>
              <option value="configured">Configured ({configuredCount})</option>
              <option value="pending">Pending Setup ({pendingCount})</option>
            </select>
          </div>

          {(filterSiteId || filterSectionId || filterStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterSiteId('');
                setFilterSectionId('');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Roster Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Workforce Opening Balances Registry</h2>
            <p className="text-xs text-slate-500">
              Showing {filteredWorkers.length} of {workers.length} employees
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              {configuredCount} Configured
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              {pendingCount} Pending
            </span>
          </div>
        </div>

        <DataTable data={filteredWorkers} columns={columns} />
      </div>

      {/* CREATE NEW OPENING EMPLOYEE MODAL (WITH BIOMETRICS & BALANCES) */}
      {showCreateModal && (
        <CreateOpeningEmployeeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(created) => {
            const net = created.openingRecord?.netOpeningBalance ?? 0;
            const netStr = net >= 0 ? `+₹${net.toLocaleString()}` : `-₹${Math.abs(net).toLocaleString()}`;
            setToastMessage(`✓ Opening Employee "${created.name}" (${created.id}) registered with biometrics & Net Opening Balance of ${netStr}!`);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* OPENING EMPLOYEE MODAL FOR EXISTING WORKERS */}
      {showModal && (
        <OpeningEmployeeModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedWorker(null);
          }}
          worker={selectedWorker}
          onSwitchToCreate={() => {
            setShowModal(false);
            setSelectedWorker(null);
            setShowCreateModal(true);
          }}
          onEditWorker={(w) => {
            setShowModal(false);
            setSelectedWorker(null);
            setEditingWorker(w);
            setShowEditWorkerModal(true);
          }}
          onDeleteWorker={(w) => {
            setShowModal(false);
            setSelectedWorker(null);
            setWorkerToDelete(w);
          }}
          onSuccess={(workerId) => {
            const w = workers.find((x) => x.id === workerId);
            setToastMessage(`✓ Opening balance & prior service recorded for "${w?.name || workerId}".`);
            setShowModal(false);
            setSelectedWorker(null);
          }}
        />
      )}

      {/* EDIT EMPLOYEE PROFILE MODAL */}
      {showEditWorkerModal && editingWorker && (
        <EditEmployeeModal
          isOpen={showEditWorkerModal}
          onClose={() => {
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
          worker={editingWorker}
          onSuccess={(w) => {
            setToastMessage(`✓ Employee "${w.name}" updated successfully.`);
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
          onDeleted={(wId) => {
            setToastMessage(`✓ Employee ID "${wId}" deleted.`);
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
        />
      )}

      {/* DELETE EMPLOYEE CONFIRMATION */}
      {workerToDelete && (
        <ConfirmDialog
          isOpen={!!workerToDelete}
          onClose={() => setWorkerToDelete(null)}
          onConfirm={() => {
            deleteWorker(workerToDelete.id);
            setToastMessage(`✓ Employee "${workerToDelete.name}" (${workerToDelete.id}) deleted permanently.`);
            setWorkerToDelete(null);
          }}
          title={`Delete Employee: ${workerToDelete.name}`}
          message={`Are you sure you want to delete employee "${workerToDelete.name}" (${workerToDelete.id})? All associated opening balances, attendance logs, advances, recoveries, and site assignments will be permanently removed. This action cannot be undone.`}
          confirmText="Delete Employee"
          variant="danger"
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default OpeningEmployees;
