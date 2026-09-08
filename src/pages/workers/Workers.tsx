import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Toast } from '../../components/common/Toast';
import {
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  UserCheck,
  Eye,
  Search,
  Edit3,
  Trash2,
} from 'lucide-react';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { EditEmployeeModal } from '../../components/sections/EditEmployeeModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
export { WorkerProfile as WorkerDetails } from './WorkerProfile';

export const Workers: React.FC = () => {
  const {
    workers,
    sites,
    sections,
    referrers,
    currentUser,
    transferWorker,
    markWorkerLeft,
    rejoinWorker,
    deleteWorker,
  } = useAttendanceContext();

  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSiteId, setFilterSiteId] = useState(currentUser?.role === 'supervisor' ? (currentUser?.assignedSiteId || '') : '');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Quick Action Modals
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);

  // Quick Transfer State
  const [transSiteId, setTransSiteId] = useState('');
  const [transSectionId, setTransSectionId] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [transReason, setTransReason] = useState('Workload balancing');

  // Quick Leave State
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('Personal / hometown leave');

  // Quick Rejoin State
  const [rejoinSiteId, setRejoinSiteId] = useState('');
  const [rejoinSectionId, setRejoinSectionId] = useState('');
  const [rejoinDate, setRejoinDate] = useState(new Date().toISOString().split('T')[0]);

  const handleQuickTransfer = () => {
    if (!selectedWorker || !transSiteId || !transSectionId) {
      alert('Please select target site and section.');
      return;
    }
    transferWorker(selectedWorker.id, transSiteId, transSectionId, transDate, transReason);
    setToastMessage(`Worker ${selectedWorker.name} transferred successfully.`);
    setShowTransferModal(false);
    setSelectedWorker(null);
  };

  const handleQuickLeave = () => {
    if (!selectedWorker) return;
    markWorkerLeft(selectedWorker.id, leaveDate, leaveReason);
    setToastMessage(`Worker ${selectedWorker.name} marked as departed.`);
    setShowLeaveModal(false);
    setSelectedWorker(null);
  };

  const handleQuickRejoin = () => {
    if (!selectedWorker || !rejoinSiteId || !rejoinSectionId) {
      alert('Please select rejoining site and section.');
      return;
    }
    rejoinWorker(selectedWorker.id, rejoinSiteId, rejoinSectionId, rejoinDate, 'Rejoined workforce');
    setToastMessage(`Worker ${selectedWorker.name} rejoined under permanent ID ${selectedWorker.id}.`);
    setShowRejoinModal(false);
    setSelectedWorker(null);
  };

  // Filtered Workers
  const filteredWorkers = workers.filter((w) => {
    // Role based site restriction
    if (currentUser?.role === 'supervisor' && w.currentSiteId !== currentUser?.assignedSiteId) {
      return false;
    }
    // Site filter
    if (filterSiteId && w.currentSiteId !== filterSiteId) return false;
    // Section filter
    if (filterSectionId && w.currentSectionId !== filterSectionId) return false;
    // Type filter
    if (filterType !== 'all' && w.workerType !== filterType) return false;
    // Status filter
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    // Search filter (Worker Name, Permanent ID, Serial Number, Mobile, Referrer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const s = sites.find((x) => x.id === w.currentSiteId);
      const serial = `${s?.code || w.currentSiteId}-${w.id}`.toLowerCase();
      const r = w.referrerId ? referrers.find((ref) => ref.id === w.referrerId) : null;
      const matchName = w.name.toLowerCase().includes(q);
      const matchId = w.id.toLowerCase().includes(q);
      const matchSerial = serial.includes(q);
      const matchMobile = w.mobile.includes(q);
      const matchRef = r?.name.toLowerCase().includes(q);
      return matchName || matchId || matchSerial || matchMobile || matchRef;
    }
    return true;
  });

  const columns: Column<Worker>[] = [
    {
      header: 'S.No',
      render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span>,
    },
    {
      header: 'Serial No',
      render: (row) => {
        const s = sites.find((site) => site.id === row.currentSiteId);
        const serial = row.serialNumber || (row.id.startsWith('W') ? `${s?.code || row.currentSiteId}-${row.id}` : row.id);
        return <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{serial}</span>;
      },
    },
    {
      header: 'Employee ID',
      accessor: 'id',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Worker Name & Phone',
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
          <div className="flex items-center space-x-1.5 flex-wrap mt-0.5">
            <span className="text-[11px] text-slate-500">{row.mobile}</span>
            {(row.designation || row.purpose) && (
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">
                {row.designation || row.purpose}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Worker Type',
      accessor: 'workerType',
      render: (row) => (
        <span
          className={`capitalize text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            row.workerType === 'company'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {row.workerType === 'company' ? 'Company' : 'Outside'}
        </span>
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
      header: 'Referrer / Agent',
      render: (row) => {
        if (row.workerType !== 'outside' || !row.referrerId) {
          return <span className="text-slate-400 text-xs">-</span>;
        }
        const ref = referrers.find((r) => r.id === row.referrerId);
        return <span className="text-xs font-medium text-slate-700">{ref?.name || row.referrerId}</span>;
      },
    },
    {
      header: 'Wage',
      render: (row) => <span className="font-bold text-xs text-slate-900">₹{row.dailyWage}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Join Date',
      accessor: 'joiningDate',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-700">{row.joiningDate}</span>
          {row.lastRejoinedDate && (
            <span className="block text-[10px] text-emerald-600 font-semibold">Rejoined: {row.lastRejoinedDate}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <Link
            to={`/workers/${row.id}`}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="View 360 Profile"
          >
            <Eye className="h-4 w-4" />
          </Link>

          {row.status === 'active' && (
            <>
              <button
                onClick={() => {
                  setSelectedWorker(row);
                  setTransSiteId(row.currentSiteId);
                  setTransSectionId('');
                  setShowTransferModal(true);
                }}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Transfer Site"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedWorker(row);
                  setShowLeaveModal(true);
                }}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                title="Mark as Left"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </>
          )}

          {row.status === 'left' && (
            <button
              onClick={() => {
                setSelectedWorker(row);
                setRejoinSiteId(row.currentSiteId);
                setRejoinSectionId('');
                setShowRejoinModal(true);
              }}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              title="Rejoin Worker"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => {
                  setEditingWorker(row);
                  setShowEditWorkerModal(true);
                }}
                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Edit Employee"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWorkerToDelete(row)}
                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Delete Employee"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Workforce Registry & 360</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {currentUser?.role === 'supervisor'
              ? `Authorized Worker Roster for Site ${currentUser?.assignedSiteId}.`
              : 'Permanent ID management, site deployments, biometric check-ins, and outside contractor commissions.'}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add New Employee</span>
          </button>
        )}
      </div>

      {/* Universal Search & Multi-Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Worker Name, Permanent ID (W001), Serial (S001-W001), Phone, Agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser?.role === 'admin' && (
              <select
                value={filterSiteId}
                onChange={(e) => {
                  setFilterSiteId(e.target.value);
                  setFilterSectionId('');
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Sections</option>
              {sections
                .filter((sec) => !filterSiteId || sec.siteId === filterSiteId)
                .map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.code} - {sec.name}
                  </option>
                ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Types</option>
              <option value="company">Company</option>
              <option value="outside">Outside</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="left">Left / Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
          <span>Showing {filteredWorkers.length} of {workers.length} workers</span>
          {(searchQuery || filterSiteId || filterSectionId || filterType !== 'all' || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                if (currentUser?.role === 'admin') setFilterSiteId('');
                setFilterSectionId('');
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-bold"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Workers Data Table */}
      <DataTable
        columns={columns}
        data={filteredWorkers}
        emptyTitle="No workers match the criteria"
        emptyDescription="Try adjusting your search terms or filters."
      />

      {/* NEW EMPLOYEE JOINING MODAL (UNIVERSAL ADMIN & SUPERVISOR) */}
      {showAddModal && (
        <NewEmployeeJoiningModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          initialSiteId={filterSiteId || undefined}
          initialSectionId={filterSectionId || undefined}
          onSuccess={(newWorker) => {
            const assignedSite = sites.find((s) => s.id === newWorker.currentSiteId);
            setToastMessage(`✓ New Employee "${newWorker.name}" registered successfully with Serial ${assignedSite?.code || newWorker.currentSiteId}-${newWorker.id}!`);
            setShowAddModal(false);
          }}
        />
      )}

      {/* QUICK MODAL 1: TRANSFER */}
      {selectedWorker && (
        <Modal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedWorker(null);
          }}
          title={`Transfer Worker: ${selectedWorker.name} (${selectedWorker.id})`}
          subtitle="Closes existing assignment and starts new assignment at target site."
          size="md"
        >
          <div className="space-y-4">
            <Select
              label="Target Site *"
              value={transSiteId}
              onChange={(e) => {
                setTransSiteId(e.target.value);
                setTransSectionId('');
              }}
              options={[
                { value: '', label: 'Select Site...' },
                ...sites.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })),
              ]}
            />
            <Select
              label="Target Section *"
              value={transSectionId}
              onChange={(e) => setTransSectionId(e.target.value)}
              disabled={!transSiteId}
              options={[
                { value: '', label: 'Select Section...' },
                ...sections
                  .filter((sec) => sec.siteId === transSiteId && sec.status === 'active')
                  .map((sec) => ({ value: sec.id, label: `${sec.code} - ${sec.name}` })),
              ]}
            />
            <DatePicker label="Transfer Date *" value={transDate} onChange={(e) => setTransDate(e.target.value)} />
            <Input label="Reason" value={transReason} onChange={(e) => setTransReason(e.target.value)} />

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedWorker(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickTransfer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* QUICK MODAL 2: MARK AS LEFT */}
      {selectedWorker && (
        <Modal
          isOpen={showLeaveModal}
          onClose={() => {
            setShowLeaveModal(false);
            setSelectedWorker(null);
          }}
          title={`Mark Worker as Left: ${selectedWorker.name}`}
          subtitle={`Worker ID ${selectedWorker.id} will be retained permanently.`}
          size="md"
        >
          <div className="space-y-4">
            <DatePicker label="Departure Date *" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
            <Input label="Reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setSelectedWorker(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickLeave}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Departure
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* QUICK MODAL 3: REJOIN */}
      {selectedWorker && (
        <Modal
          isOpen={showRejoinModal}
          onClose={() => {
            setShowRejoinModal(false);
            setSelectedWorker(null);
          }}
          title={`Rejoin Worker: ${selectedWorker.name} (${selectedWorker.id})`}
          subtitle="Reactivates under same permanent Worker ID."
          size="md"
        >
          <div className="space-y-4">
            <Select
              label="Rejoining Site *"
              value={rejoinSiteId}
              onChange={(e) => {
                setRejoinSiteId(e.target.value);
                setRejoinSectionId('');
              }}
              options={[
                { value: '', label: 'Select Site...' },
                ...sites.filter((s) => s.status === 'active').map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })),
              ]}
            />
            <Select
              label="Rejoining Section *"
              value={rejoinSectionId}
              onChange={(e) => setRejoinSectionId(e.target.value)}
              disabled={!rejoinSiteId}
              options={[
                { value: '', label: 'Select Section...' },
                ...sections
                  .filter((sec) => sec.siteId === rejoinSiteId && sec.status === 'active')
                  .map((sec) => ({ value: sec.id, label: `${sec.code} - ${sec.name}` })),
              ]}
            />
            <DatePicker label="Rejoin Date *" value={rejoinDate} onChange={(e) => setRejoinDate(e.target.value)} />

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowRejoinModal(false);
                  setSelectedWorker(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickRejoin}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Reactivate Worker
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditWorkerModal && editingWorker && (
        <EditEmployeeModal
          isOpen={showEditWorkerModal}
          onClose={() => {
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
          worker={editingWorker}
          onSuccess={(w) => setToastMessage(`Employee "${w.name}" updated successfully.`)}
        />
      )}

      {/* DELETE EMPLOYEE CONFIRMATION */}
      {workerToDelete && (
        <ConfirmDialog
          isOpen={!!workerToDelete}
          onClose={() => setWorkerToDelete(null)}
          onConfirm={() => {
            deleteWorker(workerToDelete.id);
            setToastMessage(`Employee "${workerToDelete.name}" (${workerToDelete.id}) deleted permanently.`);
            setWorkerToDelete(null);
          }}
          title={`Delete Employee: ${workerToDelete.name}`}
          message={`Are you sure you want to delete employee "${workerToDelete.name}" (${workerToDelete.id})? All associated attendance logs, advance disbursements, recovery deductions, site assignments, and payments will be permanently deleted. This action cannot be undone.`}
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

export default Workers;
