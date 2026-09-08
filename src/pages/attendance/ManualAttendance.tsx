import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker, Attendance } from '../../types';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { Toast } from '../../components/common/Toast';
import { ArrowLeft, Save, Check, UserMinus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManualAttendance: React.FC = () => {
  const { sites, sections, workers, assignments, attendance, bulkSaveAttendance, currentUser } = useAttendanceContext();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSiteId, setSelectedSiteId] = useState(currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<Worker[]>([]);
  const [sheetState, setSheetState] = useState<Record<string, Attendance['status']>>({});
  const [originalSheetState, setOriginalSheetState] = useState<Record<string, Attendance['status']>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter sections based on selected site
  const filteredSections = sections.filter((sec) => sec.siteId === selectedSiteId && sec.status === 'active');

  // Trigger site changes to clear section
  useEffect(() => {
    setSelectedSectionId('');
    setLoaded(false);
  }, [selectedSiteId]);

  // Sync selectedSiteId if role or assignedSite changes
  useEffect(() => {
    setSelectedSiteId(currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '');
    setSelectedSectionId('');
    setLoaded(false);
  }, [currentUser]);

  const handleLoadSheet = () => {
    if (!date || !selectedSiteId || !selectedSectionId) {
      alert('Please select date, site, and section.');
      return;
    }

    // Find workers assigned to this site and section on this selected date
    const targetDate = new Date(date);
    const activeAssignments = assignments.filter((asg) => {
      if (asg.siteId !== selectedSiteId || asg.sectionId !== selectedSectionId) return false;
      const fromDate = new Date(asg.fromDate);
      const toDate = asg.toDate ? new Date(asg.toDate) : null;
      return targetDate >= fromDate && (!toDate || targetDate <= toDate);
    });

    const activeWorkerIds = new Set(activeAssignments.map((asg) => asg.workerId));
    workers.forEach((w) => {
      if (
        w.currentSiteId === selectedSiteId &&
        w.currentSectionId === selectedSectionId &&
        w.status === 'active'
      ) {
        activeWorkerIds.add(w.id);
      }
    });

    const filteredWorkers = workers.filter((w) => activeWorkerIds.has(w.id));

    // Load their existing attendance for this date (if any)
    const initialStates: Record<string, Attendance['status']> = {};
    const originalStates: Record<string, Attendance['status']> = {};

    filteredWorkers.forEach((w) => {
      const existing = attendance.find((att) => att.workerId === w.id && att.date === date);
      initialStates[w.id] = existing ? existing.status : 'present'; // default to present if new record
      if (existing) {
        originalStates[w.id] = existing.status;
      }
    });

    setAssignedWorkers(filteredWorkers);
    setSheetState(initialStates);
    setOriginalSheetState(originalStates);
    setReasons({});
    setLoaded(true);
  };

  const handleStatusChange = (workerId: string, status: Attendance['status']) => {
    setSheetState((prev) => ({ ...prev, [workerId]: status }));
  };

  const handleReasonChange = (workerId: string, reason: string) => {
    setReasons((prev) => ({ ...prev, [workerId]: reason }));
  };

  const handleMarkAll = (status: Attendance['status']) => {
    const updated: Record<string, Attendance['status']> = {};
    assignedWorkers.forEach((w) => {
      updated[w.id] = status;
    });
    setSheetState((prev) => ({ ...prev, ...updated }));
  };

  const handleClear = () => {
    const updated: Record<string, Attendance['status']> = {};
    assignedWorkers.forEach((w) => {
      updated[w.id] = 'absent';
    });
    setSheetState((prev) => ({ ...prev, ...updated }));
  };

  const handleSave = () => {
    // Validate that if there's a status modification to an existing record, a reason has been typed
    const modifiedWithoutReason: string[] = [];

    assignedWorkers.forEach((w) => {
      const orig = originalSheetState[w.id];
      const current = sheetState[w.id];
      if (orig && orig !== current) {
        if (!reasons[w.id]?.trim()) {
          modifiedWithoutReason.push(w.name);
        }
      }
    });

    if (modifiedWithoutReason.length > 0) {
      alert(
        `Audit reason required for editing attendance of:\n${modifiedWithoutReason.join(
          '\n'
        )}\n\nPlease specify a change reason in the text box.`
      );
      return;
    }

    // Convert sheetState to record format
    const records = Object.entries(sheetState).map(([workerId, status]) => ({
      workerId,
      status,
    }));

    bulkSaveAttendance(date, selectedSiteId, selectedSectionId, records, currentUser?.name || 'Supervisor', reasons);
    setToastMessage(`Manual attendance sheet saved for ${date}!`);

    // Reload sheet to fetch updated values
    handleLoadSheet();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Attendance Grid</h1>
          <p className="text-sm text-gray-500">Record daily check-in logs manually for assigned work groups.</p>
        </div>
      </div>

      {/* Step 1: Select criteria */}
      <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <DatePicker label="Select Date" value={date} onChange={(e) => { setDate(e.target.value); setLoaded(false); }} />

        <Select
          label="Select Site"
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          disabled={currentUser?.role === 'supervisor'}
          options={
            currentUser?.role === 'supervisor'
              ? sites.filter(s => s.id === selectedSiteId).map(s => ({ value: s.id, label: s.name }))
              : [{ value: '', label: 'Choose a site...' }, ...sites.map((s) => ({ value: s.id, label: s.name }))]
          }
        />

        <Select
          label="Select Section"
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          disabled={!selectedSiteId}
          options={[
            { value: '', label: 'Choose a section...' },
            ...filteredSections.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />

        <button
          onClick={handleLoadSheet}
          disabled={!selectedSiteId || !selectedSectionId || !date}
          className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center space-x-2 h-9"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Load Sheet</span>
        </button>
      </div>

      {/* Step 2: Attendance Grid */}
      {loaded && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-gray-400 mr-2">Bulk actions:</span>
              <button
                onClick={() => handleMarkAll('present')}
                className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded text-xs font-medium inline-flex items-center space-x-1"
              >
                <Check className="h-3 w-3" />
                <span>Mark All Present</span>
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded text-xs font-medium inline-flex items-center space-x-1"
              >
                <UserMinus className="h-3 w-3" />
                <span>Mark All Absent</span>
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 rounded text-xs font-medium"
              >
                Clear Sheet
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">{assignedWorkers.length} assigned workers found</p>
          </div>

          {assignedWorkers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-white p-6">
              <p className="text-sm font-medium text-gray-500">No workers assigned to this site/section on this date.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Worker (Serial)</th>
                    <th className="px-6 py-3 w-[220px]">Daily Status</th>
                    <th className="px-6 py-3">Audit Trails & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {assignedWorkers.map((worker) => {
                    const status = sheetState[worker.id];
                    const originalStatus = originalSheetState[worker.id];
                    const hasChanged = originalStatus && originalStatus !== status;

                    return (
                      <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{worker.name}</div>
                          <div className="text-xs text-gray-400 flex items-center space-x-1.5 flex-wrap">
                            <span>Serial: {worker.currentSiteId}-{worker.id}</span>
                            {(worker.designation || worker.purpose) && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                                {worker.designation || worker.purpose}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(worker.id, e.target.value as Attendance['status'])}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gray-950 bg-white"
                          >
                            <option value="present">Present</option>
                            <option value="halfDay">Half Day</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                            <option value="holiday">Holiday</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          {hasChanged ? (
                            <div className="flex flex-col space-y-1">
                              <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                Audit Required: status changed from {originalStatus} to {status}
                              </label>
                              <input
                                type="text"
                                placeholder="Enter reason for change..."
                                value={reasons[worker.id] || ''}
                                onChange={(e) => handleReasonChange(worker.id, e.target.value)}
                                className="px-2.5 py-1 border border-amber-300 bg-amber-50 text-xs rounded focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
                              />
                            </div>
                          ) : originalStatus ? (
                            <span className="text-xs text-gray-400">Existing log: {originalStatus}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Fresh record check-in</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-medium inline-flex items-center space-x-2 shadow-sm transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Daily Sheet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
export default ManualAttendance;
