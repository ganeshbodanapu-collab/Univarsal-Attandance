import React, { useState } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { Camera, Scan, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast } from '../../components/common/Toast';

// Isolated mock recognition API function - easy to replace with a real face scanner API later
async function recognizeFace(workers: Worker[]): Promise<{ worker: Worker; success: boolean }> {
  // Simulate network or camera latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const activeWorkers = workers.filter((w) => w.status === 'active');
  if (activeWorkers.length === 0) {
    throw new Error('No active workers found to simulate scan.');
  }

  const randomWorker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
  return {
    worker: randomWorker,
    success: true,
  };
}

export const FaceAttendance: React.FC = () => {
  const { workers, assignments, addAttendanceRecord } = useAttendanceContext();
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<{ worker: Worker; timestamp: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSimulateScan = async () => {
    try {
      setScanning(true);
      setScannedResult(null);
      const result = await recognizeFace(workers);
      if (result.success) {
        setScannedResult({
          worker: result.worker,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Face recognition failed');
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
      method: 'face',
      checkIn: scannedResult.timestamp,
      checkOut: undefined,
    });

    setToastMessage(`Scanned face of ${worker.name}. Marked as PRESENT!`);
    setScannedResult(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/attendance" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Face Attendance Scan</h1>
          <p className="text-sm text-gray-500">Scan worker facial biometrics to log automated daily check-in.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera viewport simulation block */}
        <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border border-gray-800 text-white min-h-[300px]">
          {scanning ? (
            <div className="flex flex-col items-center space-y-3 z-10">
              <Scan className="h-12 w-12 text-cyan-400 animate-pulse" />
              <p className="text-sm font-semibold tracking-wide text-cyan-300">Analyzing Facial Biometrics...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 z-10">
              <Camera className="h-10 w-10 text-gray-500" />
              <p className="text-xs text-gray-400 font-medium">Position face inside frame</p>
            </div>
          )}

          {/* Holographic scanning grids */}
          <div className="absolute inset-6 border-2 border-dashed border-gray-700 pointer-events-none rounded-lg opacity-40"></div>
          {scanning && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce"></div>
          )}
        </div>

        {/* Scan controller and result confirmation panel */}
        <div className="flex flex-col justify-between bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          {!scannedResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
              <Scan className="h-10 w-10 text-gray-400" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Ready to Scan</h3>
                <p className="text-xs text-gray-500 max-w-[200px] mt-1">Click the button below to simulate biometric face recognition.</p>
              </div>
              <button
                onClick={handleSimulateScan}
                disabled={scanning}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {scanning ? 'Processing...' : 'Simulate Scan'}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2.5 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  <span>Face recognized successfully</span>
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
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Computed Status</label>
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
export default FaceAttendance;
