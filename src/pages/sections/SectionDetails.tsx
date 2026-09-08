import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { WorkerAttendanceModal } from '../../components/attendance/WorkerAttendanceModal';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toast } from '../../components/common/Toast';
import {
  Layers,
  Building,
  Users,
  CalendarCheck,
  DollarSign,
  Phone,
  Edit3,
  Eye,
  AlertCircle,
  Clock,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EditEmployeeModal } from '../../components/sections/EditEmployeeModal';

export const SectionDetails: React.FC = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();

  const {
    sections,
    sites,
    workers,
    attendance,
    currentUser,
    updateSection,
    deleteSection,
    deleteWorker,
  } = useAttendanceContext();

  const [activeTab, setActiveTab] = useState('workers');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Employee Modal State
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // Edit / Delete Section State
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState(false);

  // Edit / Delete Worker State
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Attendance Modal & Photo Preview State
  const [selectedWorkerForAttendance, setSelectedWorkerForAttendance] = useState<Worker | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editInCharge, setEditInCharge] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editRemarks, setEditRemarks] = useState('');

  // Find Section
  const section = sections.find((sec) => {
    if (!sectionId) return false;
    const clean = decodeURIComponent(sectionId).toLowerCase();
    return sec.id.toLowerCase() === clean || sec.code.toLowerCase() === clean;
  });

  if (!section) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Section Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          No operational section matches identifier: <span className="font-mono font-semibold text-slate-800">{sectionId}</span>
        </p>
        <button
          onClick={() => navigate('/sections')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          Back to Sections Registry
        </button>
      </div>
    );
  }

  const parentSite = sites.find((s) => s.id === section.siteId);
  const sectionWorkers = workers.filter((w) => w.currentSectionId === section.id);
  const activeWorkers = sectionWorkers.filter((w) => w.status === 'active');

  const secWorkerIds = new Set(sectionWorkers.map((w) => w.id));
  const sectionAttendance = attendance.filter((a) => secWorkerIds.has(a.workerId));

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = sectionAttendance.filter((a) => a.date === today);
  const presentToday = todayAttendance.filter((a) => a.status === 'present').length;
  const halfDayToday = todayAttendance.filter((a) => a.status === 'halfDay').length;
  const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;

  const totalDailyWage = sectionWorkers.reduce((sum, w) => sum + w.dailyWage, 0);
  const avgWage = sectionWorkers.length > 0 ? Math.round(totalDailyWage / sectionWorkers.length) : 0;

  const handleOpenEdit = () => {
    setEditName(section.name);
    setEditInCharge(section.inCharge);
    setEditMobile(section.mobile);
    setEditStatus(section.status);
    setEditRemarks(section.remarks || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editInCharge.trim() || !editMobile.trim()) {
      alert('Please fill in required fields.');
      return;
    }
    updateSection({
      ...section,
      name: editName.trim(),
      inCharge: editInCharge.trim(),
      mobile: editMobile.trim(),
      status: editStatus,
      remarks: editRemarks.trim() || undefined,
    });
    setToastMessage(`Section "${editName}" updated successfully.`);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/sites" className="hover:text-blue-600 transition-colors">Sites</Link>
        <span>/</span>
        <Link to={`/sites?siteId=${section.siteId}`} className="hover:text-blue-600 transition-colors">{parentSite?.name || 'Site'}</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{section.name} ({section.code})</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shadow-indigo-500/20 shrink-0">
              <Layers className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{section.name}</h1>
                <StatusBadge status={section.status} />
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {section.code}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                <span className="inline-flex items-center space-x-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <Link to={`/sites/${parentSite?.id}`} className="hover:text-blue-600 font-bold text-slate-800">
                    Parent Site: {parentSite?.name} ({parentSite?.code})
                  </Link>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Supervisor: <strong>{section.inCharge}</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{section.mobile}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add New Employee</span>
            </button>
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={handleOpenEdit}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Section</span>
                </button>
                <button
                  onClick={() => setShowDeleteSectionConfirm(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200/60 transition-all active:scale-95 cursor-pointer"
                  title="Delete Section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Section</span>
                </button>
              </>
            )}
            <Link
              to="/workers"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95"
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Workers</span>
            </Link>
          </div>
        </div>

        {section.remarks && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
            <strong>Scope / Remarks:</strong> {section.remarks}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Deployed Workers"
          value={sectionWorkers.length}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          description="In this section"
        />
        <StatCard
          title="Active Workforce"
          value={activeWorkers.length}
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          description="Active status"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
          description="Full day check-in"
        />
        <StatCard
          title="Half Day Today"
          value={halfDayToday}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="Half day duty"
        />
        <StatCard
          title="Absent Today"
          value={absentToday}
          icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
          description="Off site today"
        />
        <StatCard
          title="Average Wage Rate"
          value={`₹${avgWage}`}
          icon={<DollarSign className="h-5 w-5 text-teal-600" />}
          description="Per day average"
        />
      </div>

      {/* Navigation Tabs */}
      <Tabs
        options={[
          { id: 'workers', label: `Deployed Workers (${sectionWorkers.length})` },
          { id: 'attendance', label: `Section Attendance (${sectionAttendance.length})` },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: WORKERS */}
      {activeTab === 'workers' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Workforce Deployed in {section.name}</h3>
              <p className="text-xs text-slate-500">Active roster assigned to this work section</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500 font-semibold">{sectionWorkers.length} workers</span>
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Add Employee</span>
              </button>
            </div>
          </div>

          <DataTable
            data={sectionWorkers}
            columns={[
              {
                header: 'Serial No',
                render: (row) => {
                  const s = sites.find((site) => site.id === row.currentSiteId);
                  return <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{row.serialNumber || (row.id.startsWith('W') ? `${s?.code || row.currentSiteId}-${row.id}` : row.id)}</span>;
                },
              },
              {
                header: 'Employee ID',
                accessor: 'id',
                render: (row) => <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{row.id}</span>,
              },
              {
                header: 'Worker Name & Phone',
                accessor: 'name',
                sortable: true,
                render: (row) => (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForAttendance(row)}
                      className="font-bold text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors flex items-center space-x-1 cursor-pointer text-left group"
                      title="Click worker name to record Face ID, Fingerprint, or Manual Attendance"
                    >
                      <span>{row.name}</span>
                      <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Check In
                      </span>
                    </button>
                    <span className="block text-[11px] text-slate-500">{row.mobile}</span>
                  </div>
                ),
              },
              {
                header: 'Type',
                accessor: 'workerType',
                render: (row) => (
                  <span className={`capitalize text-[11px] font-bold px-2 py-0.5 rounded-full border ${row.workerType === 'company' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                    {row.workerType}
                  </span>
                ),
              },
              { header: 'Wage', render: (row) => <span className="font-bold text-xs text-slate-900">₹{row.dailyWage}</span> },
              {
                header: "Today's Attendance",
                render: (row) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  // Check today's attendance record
                  const todayRecord =
                    attendance.find((a) => a.workerId === row.id && a.date === todayStr);

                  if (!todayRecord) {
                    return (
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerForAttendance(row)}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-all inline-flex items-center space-x-1 cursor-pointer"
                        title="Not recorded yet. Click to mark attendance."
                      >
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span>Not Marked • Click Here</span>
                      </button>
                    );
                  }

                  const methodBadge = {
                    face: { label: 'Face ID', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
                    fingerprint: { label: 'Fingerprint', color: 'text-purple-700 bg-purple-50 border-purple-200' },
                    manual: { label: 'Manual', color: 'text-slate-700 bg-slate-100 border-slate-200' },
                  }[todayRecord.method] || { label: todayRecord.method, color: 'text-slate-700 bg-slate-100 border-slate-200' };

                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={todayRecord.status} />
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${methodBadge.color}`}>
                        {methodBadge.label}
                      </span>
                      {todayRecord.checkIn && (
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {todayRecord.checkIn}{todayRecord.checkOut ? ` - ${todayRecord.checkOut}` : ''}
                        </span>
                      )}
                      {todayRecord.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoModal(todayRecord.photoUrl || null)}
                          className="h-6 w-6 rounded-md overflow-hidden border border-slate-300 hover:border-blue-500 shadow-2xs flex-shrink-0 cursor-pointer"
                          title="View Attendance Photo Proof"
                        >
                          <img src={todayRecord.photoUrl} alt="Proof" className="h-full w-full object-cover" />
                        </button>
                      )}
                    </div>
                  );
                },
              },
              {
                header: 'Action',
                render: (row) => (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForAttendance(row)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                      title="Record Face ID, Fingerprint, or Manual Attendance"
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>Check In</span>
                    </button>
                    <Link
                      to={`/workers/${row.id}`}
                      className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center justify-center"
                      title="View Worker 360 Profile"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWorker(row);
                            setShowEditWorkerModal(true);
                          }}
                          className="p-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkerToDelete(row)}
                          className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Attendance Log for {section.name}</h3>
            <span className="text-xs text-slate-500">{sectionAttendance.length} records</span>
          </div>

          <DataTable
            data={sectionAttendance}
            columns={[
              { header: 'Date', accessor: 'date', sortable: true },
              {
                header: 'Worker',
                render: (row) => {
                  const w = workers.find((wk) => wk.id === row.workerId);
                  return (
                    <Link to={`/workers/${row.workerId}`} className="text-xs font-bold text-slate-900 hover:text-blue-600">
                      {w?.name || row.workerId}
                    </Link>
                  );
                },
              },
              {
                header: 'Status',
                accessor: 'status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              { header: 'Check In', accessor: 'checkIn', render: (row) => row.checkIn || '-' },
              { header: 'Check Out', accessor: 'checkOut', render: (row) => row.checkOut || '-' },
              {
                header: 'Method',
                accessor: 'method',
                render: (row) => (
                  <div className="flex items-center space-x-1.5">
                    <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">{row.method}</span>
                    {row.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoModal(row.photoUrl || null)}
                        className="h-6 w-6 rounded-md overflow-hidden border border-slate-300 hover:border-blue-500 shadow-2xs flex-shrink-0 cursor-pointer"
                        title="View Attendance Photo Proof"
                      >
                        <img src={row.photoUrl} alt="Proof" className="h-full w-full object-cover" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* WORKER ATTENDANCE MODAL (Face ID, Fingerprint, Manual with Photo Upload) */}
      {selectedWorkerForAttendance && (
        <WorkerAttendanceModal
          isOpen={!!selectedWorkerForAttendance}
          onClose={() => setSelectedWorkerForAttendance(null)}
          worker={selectedWorkerForAttendance}
          section={section}
          site={parentSite || null}
          onSuccess={(workerName, message) => {
            setToastMessage(`✓ ${workerName}: ${message}`);
          }}
        />
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewPhotoModal && (
        <Modal
          isOpen={!!previewPhotoModal}
          onClose={() => setPreviewPhotoModal(null)}
          title="Attendance Photo Proof"
          subtitle="Field Verified Check-In Snapshot"
          size="sm"
        >
          <div className="space-y-4 text-center">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 max-w-xs mx-auto aspect-square">
              <img src={previewPhotoModal} alt="Attendance photo proof" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-slate-500 font-medium">On-Site Field Supervisor Verification Snapshot</p>
            <button
              type="button"
              onClick={() => setPreviewPhotoModal(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* EDIT SECTION MODAL */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Section: ${section.name}`}
          subtitle={`Section Code: ${section.code}`}
          size="md"
        >
          <div className="space-y-4">
            <Input label="Section Name *" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Supervisor In Charge *" value={editInCharge} onChange={(e) => setEditInCharge(e.target.value)} />
              <Input label="Supervisor Mobile *" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} />
            </div>

            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />

            <Input label="Remarks" value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} />

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {currentUser?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setShowDeleteSectionConfirm(true);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Section</span>
                </button>
              ) : <div />}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Update Section
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* NEW EMPLOYEE JOINING MODAL */}
      {showAddEmployeeModal && (
        <NewEmployeeJoiningModal
          isOpen={showAddEmployeeModal}
          onClose={() => setShowAddEmployeeModal(false)}
          section={section}
          site={parentSite || null}
          onSuccess={(newWorker) => {
            setToastMessage(`✓ New Employee ${newWorker.name} enrolled with Serial ${parentSite?.code || section.siteId}-${newWorker.id}!`);
          }}
        />
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

      {/* CONFIRM DELETE EMPLOYEE */}
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
          message={`Are you sure you want to delete employee "${workerToDelete.name}" (${workerToDelete.id})? All associated attendance logs, advances, recoveries, assignments, and payments will be permanently deleted. This action cannot be undone.`}
          confirmText="Delete Employee"
          variant="danger"
        />
      )}

      {/* CONFIRM DELETE SECTION */}
      {showDeleteSectionConfirm && (
        <ConfirmDialog
          isOpen={showDeleteSectionConfirm}
          onClose={() => setShowDeleteSectionConfirm(false)}
          onConfirm={() => {
            deleteSection(section.id);
            navigate(`/sites?siteId=${section.siteId}`, { replace: true });
          }}
          title={`Delete Section: ${section.name}`}
          message={`Are you sure you want to permanently delete section "${section.name}" (${section.code})? All workers assigned to this section will also be removed. This action cannot be undone.`}
          confirmText="Delete Section"
          variant="danger"
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default SectionDetails;
