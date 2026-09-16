import React, { useState } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker, Attendance } from '../../types';
import { Fingerprint, CheckCircle, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast } from '../../components/common/Toast';

// Isolated mock scanning API function
async function scanFingerprint(
  workers: Worker[],
  mode: 'checkIn' | 'checkOut',
  attendance: Attendance[]
): Promise<{ worker: Worker; success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const today = new Date().toISOString().split('T')[0];

  if (mode === 'checkOut') {
    const checkedInWorkerIds = new Set(
      attendance.filter((a) => a.date === today && a.checkIn).map((a) => a.workerId)
    );
    const checkedInWorkers = workers.filter((w) => checkedInWorkerIds.has(w.id) && w.status === 'active');
    if (checkedInWorkers.length === 0) {
      throw new Error('No workers currently checked in today to perform Check-Out scan. Please check in a worker first!');
    }
    const randomWorker = checkedInWorkers[Math.floor(Math.random() * checkedInWorkers.length)];
    return { worker: randomWorker, success: true };
  }

  const activeWorkers = workers.filter((w) => w.status === 'active');
  if (activeWorkers.length === 0) {
    throw new Error('No active workers found to simulate fingerprint scan.');
  }

  const randomWorker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
  return { worker: randomWorker, success: true };
}

export const FingerprintAttendance: React.FC = () => {
  const { workers, assignments, attendance, registerOrUpdateAttendance } = useAttendanceContext();
  const [scanMode, setScanMode] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{ worker: Worker; timestamp: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSimulateScan = async () => {
    try {
      setScanning(true);
      setScannedResult(null);
      const result = await scanFingerprint(workers, scanMode, attendance);
      if (result.success) {
        setScannedResult({
          worker: result.worker,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Fingerprint scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmScan = () => {
    if (!scannedResult) return;

    const worker = scannedResult.worker;
    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find((a) => a.workerId === worker.id && a.date === today);

    const currentAssignment = assignments.find((asg) => asg.workerId === worker.id && asg.toDate === null);
    const assignmentId = currentAssignment?.id || `ASG-${worker.id}-AUTO`;

    if (scanMode === 'checkIn') {
      registerOrUpdateAttendance({
        workerId: worker.id,
        assignmentId,
        siteId: worker.currentSiteId,
        sectionId: worker.currentSectionId,
        date: today,
        status: 'present',
        method: 'fingerprint',
        checkIn: scannedResult.timestamp,
        checkOut: existing?.checkOut || undefined,
      });
      setToastMessage(`Scanned fingerprint of ${worker.name}. Checked IN at ${scannedResult.timestamp}! Added to Check-Out list.`);
    } else {
      registerOrUpdateAttendance({
        workerId: worker.id,
        assignmentId,
        siteId: worker.currentSiteId,
        sectionId: worker.currentSectionId,
        date: today,
        status: 'present',
        method: 'fingerprint',
        checkIn: existing?.checkIn || '08:30',
        checkOut: scannedResult.timestamp,
      });
      setToastMessage(`Scanned fingerprint of ${worker.name}. Checked OUT at ${scannedResult.timestamp}! Daily log completed.`);
    }

    setScannedResult(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <Link to="/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fingerprint Terminal</h1>
          <p className="text-sm text-gray-500">Scan worker fingerprint biometric ID to log automated Check-In or Check-Out.</p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => {
            setScanMode('checkIn');
            setScannedResult(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            scanMode === 'checkIn'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <LogIn className="h-4 w-4" />
          <span>📥 Part 1: Check-In Mode (Punch In)</span>
        </button>

        <button
          onClick={() => {
            setScanMode('checkOut');
            setScannedResult(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            scanMode === 'checkOut'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <LogOut className="h-4 w-4" />
          <span>📤 Part 2: Check-Out Mode (Punch Out)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scanner device mockup */}
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border border-gray-800 text-white min-h-[300px]">
          {scanning ? (
            <div className="flex flex-col items-center space-y-3 z-10">
              <Fingerprint className="h-14 w-14 text-purple-400 animate-pulse" />
              <p className="text-sm font-semibold tracking-wide text-purple-300">
                Reading Fingerprint ({scanMode === 'checkIn' ? 'Check-In' : 'Check-Out'})...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 z-10 cursor-pointer" onClick={handleSimulateScan}>
              <Fingerprint className="h-14 w-14 text-gray-500 hover:text-purple-400 transition-colors" />
              <p className="text-xs text-gray-400 font-medium">Place thumb on sensor</p>
            </div>
          )}

          {/* Biometric overlay */}
          <div className="absolute inset-10 border border-dashed border-gray-700 pointer-events-none rounded-full opacity-35"></div>
          {scanning && (
            <div className="absolute inset-0 bg-purple-500 bg-opacity-5 animate-pulse"></div>
          )}
        </div>

        {/* Scan confirmation panel */}
        <div className="flex flex-col justify-between bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          {!scannedResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
              <Fingerprint className="h-10 w-10 text-gray-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Biometric Sensor ({scanMode === 'checkIn' ? 'Check-In Mode' : 'Check-Out Mode'})
                </h3>
                <p className="text-xs text-gray-500 max-w-[200px] mt-1">
                  Click below to simulate {scanMode === 'checkIn' ? 'Punching In' : 'Punching Out'} via fingerprint.
                </p>
              </div>
              <button
                onClick={handleSimulateScan}
                disabled={scanning}
                className={`px-6 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center space-x-2 cursor-pointer ${
                  scanMode === 'checkIn' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {scanning ? 'Reading...' : `Simulate ${scanMode === 'checkIn' ? 'Check-In' : 'Check-Out'} Scan`}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold border ${
                  scanMode === 'checkIn'
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-indigo-800 bg-indigo-50 border-indigo-200'
                }`}>
                  <CheckCircle className="h-4 w-4" />
                  <span>Fingerprint Matched for {scanMode === 'checkIn' ? 'CHECK-IN' : 'CHECK-OUT'}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Worker Profile</label>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{scannedResult.worker.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ID: {scannedResult.worker.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Assigned Site</label>
                      <p className="text-xs font-semibold text-gray-900 mt-0.5">{scannedResult.worker.currentSiteId}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Assigned Section</label>
                      <p className="text-xs font-semibold text-gray-900 mt-0.5">{scannedResult.worker.currentSectionId}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Scan Timestamp</label>
                      <p className="text-xs font-semibold text-gray-900 mt-0.5">{scannedResult.timestamp}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Action Mode</label>
                      <p className={`text-xs font-bold uppercase mt-0.5 ${scanMode === 'checkIn' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        {scanMode === 'checkIn' ? 'PUNCH IN (Check-In)' : 'PUNCH OUT (Check-Out)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => setScannedResult(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmScan}
                  className={`flex-1 py-2 text-white rounded-lg text-xs font-medium transition-colors ${
                    scanMode === 'checkIn' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Confirm {scanMode === 'checkIn' ? 'Check-In' : 'Check-Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};
export default FingerprintAttendance;
