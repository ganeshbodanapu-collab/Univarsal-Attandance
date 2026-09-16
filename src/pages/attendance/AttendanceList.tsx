import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Attendance, Worker } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { FilterBar } from '../../components/common/FilterBar';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { DatePicker } from '../../components/common/DatePicker';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { Modal } from '../../components/common/Modal';
import { Toast } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';
import { WorkerAttendanceModal } from '../../components/attendance/WorkerAttendanceModal';
import { calculateFood } from '../../utils/calculations/calculateFood';
import { calculateDailyWage } from '../../utils/calculations/calculateWage';
import { calculateCommission } from '../../utils/calculations/calculateCommission';
import { Link } from 'react-router-dom';
import { Camera, Fingerprint, CalendarDays, History, Edit2, LogIn, LogOut, Users, CheckCircle2, Clock } from 'lucide-react';

interface AttendanceRow extends Attendance {
  workerName: string;
  workerType: 'company' | 'outside';
  dailyWage: number;
  commissionRate: number;
  siteName: string;
  sectionName: string;
  siteId: string;
  sectionId: string;
}

export const AttendanceList: React.FC = () => {
  const {
    attendance,
    workers,
    sites,
    sections,
    assignments,
    audits,
    settings,
    updateAttendanceStatus,
    currentUser,
  } = useAttendanceContext();

  // 2-Part Sub-Navigation Tab State (Part 1 Check-In vs Part 2 Check-Out)
  const [partTab, setPartTab] = useState<'checkIn' | 'checkOut'>('checkIn');

  // Attendance Punch Modal State
  const [modalWorker, setModalWorker] = useState<Worker | null>(null);
  const [modalMode, setModalMode] = useState<'checkIn' | 'checkOut'>('checkIn');

  // Filters State
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // default to today
  const [filterSite, setFilterSite] = useState(currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '');
  const [filterSection, setFilterSection] = useState('');
  const [filterWorkerType, setFilterWorkerType] = useState('');
  const [searchWorker, setSearchWorker] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  // Sync filterSite if role or assignedSite changes
  useEffect(() => {
    setFilterSite(currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '');
    setFilterSection('');
  }, [currentUser]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals & Drawer State
  const [selectedAuditWorkerId, setSelectedAuditWorkerId] = useState<string | null>(null);
  const [selectedEditRecord, setSelectedEditRecord] = useState<AttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<Attendance['status']>('present');
  const [auditReason, setAuditReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sorting State
  const [sortKey, setSortKey] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleResetFilters = () => {
    setFilterDate('');
    setFilterSite('');
    setFilterSection('');
    setFilterWorkerType('');
    setSearchWorker('');
    setFilterStatus('');
    setFilterMethod('');
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // 1. Process & Filter Data
  const baseProcessedData = attendance
    .map((record) => {
      const worker = workers.find((w) => w.id === record.workerId);
      const assignment = assignments.find((asg) => asg.id === record.assignmentId);
      const site = sites.find((s) => s.id === assignment?.siteId);
      const section = sections.find((sec) => sec.id === assignment?.sectionId);

      return {
        ...record,
        workerName: worker?.name || 'Unknown',
        workerType: worker?.workerType || 'company',
        dailyWage: worker?.dailyWage || 0,
        commissionRate: worker?.commissionRate || 0,
        siteName: site?.name || 'Unassigned Site',
        sectionName: section?.name || 'Unassigned Section',
        siteId: assignment?.siteId || '',
        sectionId: assignment?.sectionId || '',
      };
    });

  // Calculate summary stat counts for today / selected filter
  const targetDateForStats = filterDate || new Date().toISOString().split('T')[0];
  const statsDateRecords = baseProcessedData.filter(
    (row) => row.date === targetDateForStats && (!filterSite || row.siteId === filterSite)
  );
  const statTotalRecords = statsDateRecords.length;
  const statCheckedInCount = statsDateRecords.filter((r) => r.checkIn && !r.checkOut).length;
  const statCheckedOutCount = statsDateRecords.filter((r) => r.checkIn && r.checkOut).length;
  const statAbsentCount = statsDateRecords.filter((r) => r.status === 'absent' || r.status === 'leave').length;

  const filteredData = baseProcessedData.filter((row) => {
    if (filterDate && row.date !== filterDate) return false;
    if (filterSite && row.siteId !== filterSite) return false;
    if (filterSection && row.sectionId !== filterSection) return false;
    if (filterWorkerType && row.workerType !== filterWorkerType) return false;
    if (filterStatus && row.status !== filterStatus) return false;
    if (filterMethod && row.method !== filterMethod) return false;
    if (
      searchWorker &&
      !row.workerName.toLowerCase().includes(searchWorker.toLowerCase()) &&
      !row.workerId.toLowerCase().includes(searchWorker.toLowerCase())
    ) {
      return false;
    }
    // AUTOMATIC HANDOFF FILTER FOR PART 2 CHECK-OUT ROSTER:
    // Display ONLY workers who have Checked In today!
    if (partTab === 'checkOut') {
      if (!row.checkIn) return false;
    }
    return true;
  });

  // 2. Sort Data
  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = a[sortKey as keyof typeof a];
    let bVal = b[sortKey as keyof typeof b];

    if (aVal === undefined) aVal = '';
    if (bVal === undefined) bVal = '';

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // 3. Paginate Data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Columns definition for DataTable
  const columns: Column<(typeof filteredData)[0]>[] = [
    {
      header: 'S.No',
      render: (_, idx) => (currentPage - 1) * itemsPerPage + idx + 1,
    },
    {
      header: 'Worker ID',
      accessor: 'workerId',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-gray-700">
          {row.siteId}-{row.workerId}
        </span>
      ),
    },
    {
      header: 'Worker Name',
      accessor: 'workerName',
      sortable: true,
    },
    {
      header: 'Site',
      accessor: 'siteName',
      sortable: true,
    },
    {
      header: 'Section',
      accessor: 'sectionName',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Method',
      accessor: 'method',
      sortable: true,
      render: (row) => (
        <span className="capitalize text-xs font-semibold px-2 py-0.5 border rounded border-gray-150 bg-gray-50 text-gray-600">
          {row.method}
        </span>
      ),
    },
    {
      header: 'Check-in',
      accessor: 'checkIn',
      render: (row) => row.checkIn || '--:--',
    },
    {
      header: 'Check-out',
      accessor: 'checkOut',
      render: (row) => row.checkOut || '--:--',
    },
    {
      header: 'Food',
      render: (row) => {
        const factor = calculateFood(row.status, settings);
        return <span className="font-medium text-xs text-gray-600">{factor} qty</span>;
      },
    },
    {
      header: 'Wage',
      render: (row) => {
        if (row.workerType !== 'outside') return <span className="text-gray-400">-</span>;
        const wage = calculateDailyWage(row.status, row.dailyWage, settings);
        return <span className="font-semibold">â‚¹{wage}</span>;
      },
    },
    {
      header: 'Commission',
      render: (row) => {
        const commission = calculateCommission(row.status, row.commissionRate, settings);
        return <span className="font-semibold text-gray-700">â‚¹{commission}</span>;
      },
    },
    {
      header: 'Actions',
      render: (row) => {
        const targetWorker = workers.find((w) => w.id === row.workerId) || null;
        return (
          <div className="flex items-center space-x-2">
            {!row.checkIn ? (
              <button
                onClick={() => {
                  setModalWorker(targetWorker);
                  setModalMode('checkIn');
                }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-xs font-bold inline-flex items-center space-x-1 transition-colors"
                title="Punch In Employee"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Punch In</span>
              </button>
            ) : !row.checkOut ? (
              <button
                onClick={() => {
                  setModalWorker(targetWorker);
                  setModalMode('checkOut');
                }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded text-xs font-bold inline-flex items-center space-x-1 transition-colors"
                title="Punch Out Employee"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Punch Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setModalWorker(targetWorker);
                  setModalMode('checkOut');
                }}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                title="Completed — Re-Punch / Edit"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Complete</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedEditRecord(row);
                setEditStatus(row.status);
                setAuditReason('');
              }}
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-150 rounded"
              title="Edit Log"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedAuditWorkerId(row.workerId)}
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-150 rounded"
              title="Audit History"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // Audit Logs for selected worker
  const selectedWorker = workers.find((w) => w.id === selectedAuditWorkerId);
  const workerAudits = audits.filter((aud) => aud.workerId === selectedAuditWorkerId);

  const handleSaveEdit = () => {
    if (!selectedEditRecord) return;
    if (!auditReason.trim()) {
      alert('Please specify a reason for correcting the status.');
      return;
    }

    updateAttendanceStatus(
      selectedEditRecord.id,
      editStatus,
      currentUser?.name || 'System',
      auditReason
    );

    setToastMessage(`Corrected attendance for ${selectedEditRecord.workerName}`);
    setSelectedEditRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees Roster &amp; Daily Attendance Log</h1>
          <p className="text-sm text-gray-500">2-Part Check-In &amp; Check-Out Workflow with Biometrics &amp; Manual Verification.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/attendance/face"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold inline-flex items-center space-x-1.5 shadow-sm"
          >
            <Camera className="h-4 w-4 text-cyan-600" />
            <span>Face Terminal</span>
          </Link>
          <Link
            to="/attendance/fingerprint"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold inline-flex items-center space-x-1.5 shadow-sm"
          >
            <Fingerprint className="h-4 w-4 text-purple-600" />
            <span>Fingerprint Terminal</span>
          </Link>
          <Link
            to="/attendance/manual"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold inline-flex items-center space-x-1.5 shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Manual Sheet Entry</span>
          </Link>
        </div>
      </div>

      {/* 2-Part Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-2">
        <div className="flex items-center space-x-2 flex-1">
          <button
            onClick={() => {
              setPartTab('checkIn');
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              partTab === 'checkIn'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>📥 Part 1: Check-In Roster (Punch In)</span>
          </button>

          <button
            onClick={() => {
              setPartTab('checkOut');
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              partTab === 'checkOut'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <LogOut className="h-4 w-4" />
            <span>📤 Part 2: Check-Out Roster (Punch Out)</span>
            {statCheckedInCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                {statCheckedInCount} Awaiting
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Roster</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{statTotalRecords}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Checked-In (Awaiting Out)</p>
            <p className="text-lg font-black text-emerald-700 mt-0.5">{statCheckedInCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <LogIn className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Checked-Out (Completed)</p>
            <p className="text-lg font-black text-indigo-700 mt-0.5">{statCheckedOutCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LogOut className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Absent / Leave</p>
            <p className="text-lg font-black text-rose-600 mt-0.5">{statAbsentCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar onReset={handleResetFilters}>
        <DatePicker
          label="Date"
          value={filterDate}
          onChange={(e) => {
            setFilterDate(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 w-[140px]"
        />

        <Select
          label="Site"
          value={filterSite}
          onChange={(e) => {
            setFilterSite(e.target.value);
            setFilterSection('');
            setCurrentPage(1);
          }}
          disabled={currentUser?.role === 'supervisor'}
          options={
            currentUser?.role === 'supervisor'
              ? sites.filter(s => s.id === filterSite).map((s) => ({ value: s.id, label: s.name }))
              : [{ value: '', label: 'All Sites' }, ...sites.map((s) => ({ value: s.id, label: s.name }))]
          }
          className="h-9 w-[160px]"
        />

        <Select
          label="Section"
          value={filterSection}
          onChange={(e) => {
            setFilterSection(e.target.value);
            setCurrentPage(1);
          }}
          disabled={!filterSite}
          options={[
            { value: '', label: 'All Sections' },
            ...sections
              .filter((sec) => sec.siteId === filterSite)
              .map((s) => ({ value: s.id, label: s.name })),
          ]}
          className="h-9 w-[160px]"
        />

        <Select
          label="Type"
          value={filterWorkerType}
          onChange={(e) => {
            setFilterWorkerType(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: '', label: 'All Types' },
            { value: 'company', label: 'Company' },
            { value: 'outside', label: 'Outside' },
          ]}
          className="h-9 w-[120px]"
        />

        <Input
          label="Search Worker"
          placeholder="Name or ID..."
          value={searchWorker}
          onChange={(e) => {
            setSearchWorker(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 w-[180px]"
        />

        <Select
          label="Status"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'present', label: 'Present' },
            { value: 'halfDay', label: 'Half Day' },
            { value: 'absent', label: 'Absent' },
            { value: 'leave', label: 'Leave' },
            { value: 'holiday', label: 'Holiday' },
          ]}
          className="h-9 w-[130px]"
        />

        <Select
          label="Method"
          value={filterMethod}
          onChange={(e) => {
            setFilterMethod(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: '', label: 'All Methods' },
            { value: 'face', label: 'Face' },
            { value: 'fingerprint', label: 'Fingerprint' },
            { value: 'manual', label: 'Manual' },
          ]}
          className="h-9 w-[135px]"
        />
      </FilterBar>

      {/* Main Table Grid */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={paginatedData}
          emptyTitle="No attendance logs found"
          emptyDescription="There are no check-in logs corresponding to the current set of filters."
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDirection}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Audit Logs Sidebar Drawer */}
      <Drawer
        isOpen={!!selectedAuditWorkerId}
        onClose={() => setSelectedAuditWorkerId(null)}
        title={`Audit History: ${selectedWorker?.name || ''}`}
      >
        {workerAudits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <History className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold">No audit logs found</p>
            <p className="text-xs text-gray-400 mt-1">This worker has no registered manual attendance changes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workerAudits.map((aud) => (
              <div key={aud.id} className="p-4 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Log: {aud.id}</span>
                  <span>{new Date(aud.changedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-gray-500">Status Change:</span>
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <span className="text-red-600 line-through capitalize">{aud.oldStatus}</span>
                    <span>&rarr;</span>
                    <span className="text-green-600 capitalize">{aud.newStatus}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 leading-relaxed font-medium">
                  <span className="text-gray-400 uppercase font-bold text-[9px] block">Correction Reason</span>
                  {aud.reason}
                </div>
                <div className="text-[10px] text-gray-500 font-bold border-t border-gray-200 pt-1.5 mt-1 flex justify-between">
                  <span>Changed By: {aud.changedBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* Edit Record Modal */}
      <Modal
        isOpen={!!selectedEditRecord}
        onClose={() => setSelectedEditRecord(null)}
        title={`Correct Status: ${selectedEditRecord?.workerName || ''}`}
        subtitle="Manual status override generates an immutable supervisor audit log."
        icon={<Edit2 className="h-5 w-5" />}
        size="md"
      >
        {selectedEditRecord && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Correcting attendance record for Date: <span className="font-bold text-gray-900">{selectedEditRecord.date}</span>
              </p>
            </div>

            <Select
              label="Select Correct Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as Attendance['status'])}
              options={[
                { value: 'present', label: 'Present' },
                { value: 'halfDay', label: 'Half Day' },
                { value: 'absent', label: 'Absent' },
                { value: 'leave', label: 'Leave' },
                { value: 'holiday', label: 'Holiday' },
              ]}
            />

            <Input
              label="Supervisor Name"
              value="Amit Singh (Admin)"
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />

            <Input
              label="Correction Reason (Required)"
              placeholder="e.g. Scanner malfunction, verified presence manually"
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
            />

            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setSelectedEditRecord(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!auditReason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Confirm Correction
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Worker Check-In / Check-Out Attendance Modal */}
      {modalWorker && (
        <WorkerAttendanceModal
          isOpen={!!modalWorker}
          onClose={() => setModalWorker(null)}
          worker={modalWorker}
          initialMode={modalMode}
          onSuccess={(workerName, message) => {
            setToastMessage(`${workerName}: ${message}`);
          }}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
export default AttendanceList;

