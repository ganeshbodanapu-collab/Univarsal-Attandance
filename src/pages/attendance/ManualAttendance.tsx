import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker, Attendance } from '../../types';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { Toast } from '../../components/common/Toast';
import { ArrowLeft, Save, Check, UserMinus, RefreshCw, LogIn, LogOut, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ManualAttendance: React.FC = () => {
  const { sites, sections, workers, assignments, attendance, bulkSaveAttendance, registerOrUpdateAttendance, currentUser } = useAttendanceContext();

  const [partTab, setPartTab] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSiteId, setSelectedSiteId] = useState(currentUser?.role === 'supervisor' ? currentUser?.assignedSiteId || '' : '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState<Worker[]>([]);
  const [sheetState, setSheetState] = useState<Record<string, Attendance['status']>>({});
  const [originalSheetState, setOriginalSheetState] = useState<Record<string, Attendance['status']>>({});
  const [checkInTimes, setCheckInTimes] = useState<Record<string, string>>({});
  const [checkOutTimes, setCheckOutTimes] = useState<Record<string, string>>({});
  const [siteAmounts, setSiteAmounts] = useState<Record<string, string>>({});
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

    let filteredWorkers = workers.filter((w) => activeWorkerIds.has(w.id));

    // AUTOMATIC HANDOFF FOR PART 2 CHECK-OUT SHEET:
    // Display ONLY workers who have Checked In today!
    if (partTab === 'checkOut') {
      const checkedInIds = new Set(
        attendance.filter((a) => a.date === date && a.checkIn).map((a) => a.workerId)
      );
      filteredWorkers = filteredWorkers.filter((w) => checkedInIds.has(w.id));
    }

    // Load their existing attendance for this date (if any)
    const initialStates: Record<string, Attendance['status']> = {};
    const originalStates: Record<string, Attendance['status']> = {};
    const inTimes: Record<string, string> = {};
    const outTimes: Record<string, string> = {};
    const amounts: Record<string, string> = {};

    filteredWorkers.forEach((w) => {
      const existing = attendance.find((att) => att.workerId === w.id && att.date === date);
      initialStates[w.id] = existing ? existing.status : 'present';
      inTimes[w.id] = existing?.checkIn || '08:30';
      outTimes[w.id] = existing?.checkOut || new Date().toTimeString().substring(0, 5) || '17:30';
      amounts[w.id] = existing?.siteAmountGiven ? existing.siteAmountGiven.toString() : '';

      if (existing) {
        originalStates[w.id] = existing.status;
      }
    });

    setAssignedWorkers(filteredWorkers);
    setSheetState(initialStates);
    setOriginalSheetState(originalStates);
    setCheckInTimes(inTimes);
    setCheckOutTimes(outTimes);
    setSiteAmounts(amounts);
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

  const handleMarkAllCheckOutTime = (time: string) => {
    const updated: Record<string, string> = {};
    assignedWorkers.forEach((w) => {
      updated[w.id] = time;
    });
    setCheckOutTimes((prev) => ({ ...prev, ...updated }));
  };

  const handleClear = () => {
    const updated: Record<string, Attendance['status']> = {};
    assignedWorkers.forEach((w) => {
      updated[w.id] = 'absent';
    });
    setSheetState((prev) => ({ ...prev, ...updated }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (isSubmitting) return;

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

    setIsSubmitting(true);
    try {
      if (partTab === 'checkIn') {
        const records = Object.entries(sheetState).map(([workerId, status]) => ({
          workerId,
          status,
          checkIn: checkInTimes[workerId] || '08:30',
        }));
        await bulkSaveAttendance(date, selectedSiteId, selectedSectionId, records, currentUser?.name || 'Supervisor', reasons);
        setToastMessage(`Check-In sheet saved for ${date}! All workers added to Check-Out roster.`);
      } else {
        // Save Check-Out sheet updates for each worker
        assignedWorkers.forEach((w) => {
          const existing = attendance.find((att) => att.workerId === w.id && att.date === date);
          const activeAssignment = assignments.find((asg) => asg.workerId === w.id && asg.toDate === null);
          const parsedAmount = siteAmounts[w.id] ? parseFloat(siteAmounts[w.id]) : undefined;

          registerOrUpdateAttendance({
            workerId: w.id,
            assignmentId: activeAssignment?.id || `ASG-${selectedSiteId}-${selectedSectionId}`,
            date,
            status: sheetState[w.id] || 'present',
            method: existing?.method || 'manual',
            checkIn: existing?.checkIn || checkInTimes[w.id] || '08:30',
            checkOut: checkOutTimes[w.id] || new Date().toTimeString().substring(0, 5) || '17:30',
            siteId: selectedSiteId,
            sectionId: selectedSectionId,
            siteAmountGiven: parsedAmount && parsedAmount > 0 ? parsedAmount : undefined,
            siteAmountMode: parsedAmount ? 'cash' : undefined,
            remarks: reasons[w.id]?.trim() || undefined,
            markedBy: currentUser?.name || 'Supervisor',
          });
        });

        setToastMessage(`Check-Out sheet saved for ${date}! Shift logs & site amounts updated.`);
      }

      // Reload sheet to fetch updated values
      handleLoadSheet();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Attendance Sheet Grid</h1>
          <p className="text-sm text-gray-500">2-Part Manual Entry for Daily Check-In &amp; Check-Out logs.</p>
        </div>
      </div>

      {/* Part 1 vs Part 2 Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => {
            setPartTab('checkIn');
            setLoaded(false);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            partTab === 'checkIn'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <LogIn className="h-4 w-4" />
          <span>📥 Part 1: Check-In Sheet (Punch In)</span>
        </button>

        <button
          onClick={() => {
            setPartTab('checkOut');
            setLoaded(false);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            partTab === 'checkOut'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <LogOut className="h-4 w-4" />
          <span>📤 Part 2: Check-Out Sheet (Punch Out)</span>
        </button>
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
          className={`w-full py-2 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center space-x-2 h-9 cursor-pointer ${
            partTab === 'checkIn' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Load {partTab === 'checkIn' ? 'Check-In' : 'Check-Out'} Sheet</span>
        </button>
      </div>

      {/* Step 2: Attendance Grid */}
      {loaded && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-gray-400 mr-2">Bulk actions:</span>
              {partTab === 'checkIn' ? (
                <>
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
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleMarkAllCheckOutTime('17:30')}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded text-xs font-medium inline-flex items-center space-x-1"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Set All Out: 17:30</span>
                  </button>
                  <button
                    onClick={() => handleMarkAllCheckOutTime(new Date().toTimeString().substring(0, 5))}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-xs font-medium inline-flex items-center space-x-1"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Set All Out: Current Time</span>
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {assignedWorkers.length} {partTab === 'checkIn' ? 'assigned' : 'checked-in'} workers loaded
            </p>
          </div>

          {assignedWorkers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-white p-6">
              <p className="text-sm font-semibold text-gray-700">
                {partTab === 'checkOut'
                  ? 'No workers currently checked in for this site & section on this date.'
                  : 'No workers assigned to this site/section on this date.'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {partTab === 'checkOut' ? 'Please check in workers under Part 1: Check-In Sheet first.' : ''}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Worker (Serial)</th>
                    {partTab === 'checkIn' ? (
                      <>
                        <th className="px-6 py-3 w-[200px]">Daily Status</th>
                        <th className="px-6 py-3 w-[150px]">Check-In Time</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 w-[130px]">Check-In</th>
                        <th className="px-6 py-3 w-[160px]">Check-Out Time</th>
                        <th className="px-6 py-3 w-[160px]">Site Amount Given (₹)</th>
                      </>
                    )}
                    <th className="px-6 py-3">Audit Trails &amp; Remarks</th>
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

                        {partTab === 'checkIn' ? (
                          <>
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
                              <input
                                type="time"
                                value={checkInTimes[worker.id] || '08:30'}
                                onChange={(e) =>
                                  setCheckInTimes((prev) => ({ ...prev, [worker.id]: e.target.value }))
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-800 bg-white"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                In: {checkInTimes[worker.id] || '08:30'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="time"
                                value={checkOutTimes[worker.id] || '17:30'}
                                onChange={(e) =>
                                  setCheckOutTimes((prev) => ({ ...prev, [worker.id]: e.target.value }))
                                }
                                className="w-full px-2 py-1.5 border border-indigo-300 rounded text-xs font-bold text-indigo-900 bg-indigo-50/50"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={siteAmounts[worker.id] || ''}
                                  onChange={(e) =>
                                    setSiteAmounts((prev) => ({ ...prev, [worker.id]: e.target.value }))
                                  }
                                  className="w-full pl-6 pr-2 py-1.5 border border-amber-300 rounded text-xs font-bold text-amber-900 bg-amber-50/50"
                                />
                              </div>
                            </td>
                          </>
                        )}

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
                          ) : (
                            <input
                              type="text"
                              placeholder="Optional shift notes..."
                              value={reasons[worker.id] || ''}
                              onChange={(e) => handleReasonChange(worker.id, e.target.value)}
                              className="px-2.5 py-1 border border-gray-200 bg-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                            />
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
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-md transition-colors cursor-pointer disabled:opacity-50 ${
                    partTab === 'checkIn' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Saving Sheet...'
                      : partTab === 'checkIn'
                      ? 'Save Check-In Sheet'
                      : 'Save Check-Out Sheet'}
                  </span>
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
