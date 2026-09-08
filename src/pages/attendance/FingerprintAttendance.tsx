import React, { useState } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { Fingerprint, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast } from '../../components/common/Toast';

// Isolated mock scanning API function - easy to replace with a real hardware API later
async function scanFingerprint(workers: Worker[]): Promise<{ worker: Worker; success: boolean }> {
  // Simulate hardware latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const activeWorkers = workers.filter((w) => w.status === 'active');
  if (activeWorkers.length === 0) {
    throw new Error('No active workers found to simulate fingerprint scan.');
  }

  const randomWorker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
  return {
    worker: randomWorker,
    success: true,
  };
}

export const FingerprintAttendance: React.FC = () => {
  const { workers, assignments, addAttendanceRecord } = useAttendanceContext();
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{ worker: Worker; timestamp: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSimulateScan = async () => {
    try {
      setScanning(true);
      setScannedResult(null);
      const result = await scanFingerprint(workers);
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

    // Find the current active assignment for this worker or fallback to worker site
    const currentAssignment = assignments.find((asg) => asg.workerId === worker.id && asg.toDate === null);
    const assignmentId = currentAssignment?.id || `ASG-${worker.id}-AUTO`;

    addAttendanceRecord({
      workerId: worker.id,
      assignmentId,
      siteId: worker.currentSiteId,
      sectionId: worker.currentSectionId,
      date: today,
      status: 'present',
      method: 'fingerprint',
      checkIn: scannedResult.timestamp,
      checkOut: undefined,
    });

    setToastMessage(`Scanned fingerprint of ${worker.name}. Marked as PRESENT!`);
    setScannedResult(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fingerprint Attendance</h1>
          <p className="text-sm text-gray-500">Scan worker fingerprint biometric ID to log daily attendance check-in.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scanner device mockup */}
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border border-gray-800 text-white min-h-[300px]">
          {scanning ? (
            <div className="flex flex-col items-center space-y-3 z-10">
              <Fingerprint className="h-14 w-14 text-emerald-400 animate-pulse" />
              <p className="text-sm font-semibold tracking-wide text-emerald-300">Reading Fingerprint Ridges...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 z-10 cursor-pointer" onClick={handleSimulateScan}>
              <Fingerprint className="h-14 w-14 text-gray-500 hover:text-emerald-500 transition-colors" />
              <p className="text-xs text-gray-400 font-medium">Place finger on scanner</p>
            </div>
          )}

          {/* Biometric overlay */}
          <div className="absolute inset-10 border border-dashed border-gray-700 pointer-events-none rounded-full opacity-35"></div>
          {scanning && (
            <div className="absolute inset-0 bg-emerald-500 bg-opacity-5 animate-pulse"></div>
          )}
        </div>

        {/* Scan confirmation panel */}
        <div className="flex flex-col justify-between bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          {!scannedResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
              <Fingerprint className="h-10 w-10 text-gray-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Biometric Sensor Ready</h3>
                <p className="text-xs text-gray-500 max-w-[200px] mt-1">Press the simulation button to scan an active worker profile.</p>
              </div>
              <button
                onClick={handleSimulateScan}
                disabled={scanning}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {scanning ? 'Reading...' : 'Simulate Scan'}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2.5 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Fingerprint template matched</span>
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
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Attendance Status</label>
                      <p className="text-xs font-bold text-green-600 uppercase mt-0.5">PRESENT</p>
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
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Confirm Check-in
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
