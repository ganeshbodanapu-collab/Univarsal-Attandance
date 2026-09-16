import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { Scan, CheckCircle2, ArrowLeft, LogIn, LogOut, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast } from '../../components/common/Toast';
import { detectSingleFace, matchFaceDescriptor, loadFaceApiModels, type FaceMatchResult } from '../../lib/faceRecognitionEngine';
import { faceProfilesDataService, type WorkerFaceProfile } from '../../lib/data/faceProfiles';

export const FaceAttendance: React.FC = () => {
  const { workers, assignments, attendance, currentUser, registerOrUpdateAttendance } = useAttendanceContext();

  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'denied' | 'error'>('loading');
  const [cameraMessage, setCameraMessage] = useState<string>('Initializing AI Face Recognition...');

  const [enrolledProfiles, setEnrolledProfiles] = useState<WorkerFaceProfile[]>([]);
  const isScanningActive = true;

  // Recognition state
  const [lastScanResult, setLastScanResult] = useState<{
    worker: Worker;
    match: FaceMatchResult;
    action: 'in' | 'out' | 'completed';
    timestamp: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const cooldownMapRef = useRef<Map<string, number>>(new Map()); // workerId -> expiry timestamp

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraState('loading');
  }, []);

  // Fetch authorized enrolled face profiles from Supabase DB
  const loadFaceProfiles = useCallback(async () => {
    try {
      const siteScope = currentUser?.role === 'supervisor' ? currentUser.assignedSiteId : undefined;
      const { data } = await faceProfilesDataService.listActiveFaceProfiles(siteScope);
      if (data) {
        setEnrolledProfiles(data);
        console.log(`[FaceAttendance] Loaded ${data.length} active face profiles for scope: ${siteScope || 'Global'}`);
      }
    } catch (err) {
      console.warn('[FaceAttendance] Profile load notice:', err);
    }
  }, [currentUser]);

  // Start live camera stream
  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      setCameraState('loading');
      setCameraMessage('Loading AI Face Recognition Models...');

      const modelsLoaded = await loadFaceApiModels();

      if (!modelsLoaded) {
        setCameraState('error');
        setCameraMessage('Failed to load Face AI models. Please check internet connection.');
        return;
      }

      await loadFaceProfiles();

      setCameraMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('active');
      setCameraMessage('Camera Terminal Active — Align face in frame.');
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setCameraState(err.name === 'NotAllowedError' ? 'denied' : 'error');
      setCameraMessage('Camera unavailable. Please use Manual Attendance.');
    }
  }, [stopCamera, loadFaceProfiles]);

  // Main real-time continuous face recognition frame processor
  const processFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      cameraState !== 'active' ||
      !isScanningActive ||
      isProcessingRef.current ||
      enrolledProfiles.length === 0
    ) {
      return;
    }

    try {
      isProcessingRef.current = true;
      const detection = await detectSingleFace(videoRef.current);

      if (detection.errorMessage || !detection.descriptor) {
        setCameraMessage(detection.errorMessage || 'Position face inside camera frame');
        isProcessingRef.current = false;
        return;
      }

      // Match face against enrolled profiles
      const match = matchFaceDescriptor(detection.descriptor, enrolledProfiles, 0.55);

      if (!match) {
        setCameraMessage('Face not recognized. Access Denied.');
        isProcessingRef.current = false;
        return;
      }

      // Check cooldown map to prevent continuous duplicate scans of same person
      const now = Date.now();
      const lastScanTime = cooldownMapRef.current.get(match.workerId) || 0;
      if (now - lastScanTime < 8000) {
        // Cooldown active (8 seconds)
        isProcessingRef.current = false;
        return;
      }

      // Find worker details
      const matchedWorker = workers.find((w) => w.id === match.workerId);
      if (!matchedWorker) {
        setCameraMessage(`Enrolled profile found (${match.workerId}), but worker profile inactive.`);
        isProcessingRef.current = false;
        return;
      }

      // Check Supervisor Site Scope Permission
      if (currentUser?.role === 'supervisor' && currentUser.assignedSiteId) {
        if (matchedWorker.currentSiteId !== currentUser.assignedSiteId) {
          setCameraMessage(`Denied: ${matchedWorker.name} is assigned to Site ${matchedWorker.currentSiteId}.`);
          isProcessingRef.current = false;
          return;
        }
      }

      // Process Attendance (TIME IN / TIME OUT)
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const existingRecord = attendance.find((a) => a.workerId === matchedWorker.id && a.date === today);

      const activeAssignment = assignments.find((asg) => asg.workerId === matchedWorker.id && asg.toDate === null);
      const assignmentId = activeAssignment?.id || `ASG-${matchedWorker.id}-AUTO`;

      // Update Cooldown
      cooldownMapRef.current.set(match.workerId, now);

      if (!existingRecord || !existingRecord.checkIn) {
        // TIME IN
        registerOrUpdateAttendance({
          workerId: matchedWorker.id,
          assignmentId,
          siteId: matchedWorker.currentSiteId,
          sectionId: matchedWorker.currentSectionId,
          date: today,
          status: 'present',
          method: 'face',
          checkIn: currentTime,
          checkOut: existingRecord?.checkOut || undefined,
          photoUrl: matchedWorker.photoUrl,
          markedBy: currentUser?.name || 'Face Biometric Terminal',
        });

        setLastScanResult({
          worker: matchedWorker,
          match,
          action: 'in',
          timestamp: currentTime,
        });
        setToastMessage(`✓ TIME IN SUCCESSFUL: ${matchedWorker.name} at ${currentTime}`);
      } else if (existingRecord.checkIn && !existingRecord.checkOut) {
        // TIME OUT
        registerOrUpdateAttendance({
          workerId: matchedWorker.id,
          assignmentId,
          siteId: matchedWorker.currentSiteId,
          sectionId: matchedWorker.currentSectionId,
          date: today,
          status: 'present',
          method: 'face',
          checkIn: existingRecord.checkIn,
          checkOut: currentTime,
          photoUrl: matchedWorker.photoUrl,
          markedBy: currentUser?.name || 'Face Biometric Terminal',
        });

        setLastScanResult({
          worker: matchedWorker,
          match,
          action: 'out',
          timestamp: currentTime,
        });
        setToastMessage(`✓ TIME OUT SUCCESSFUL: ${matchedWorker.name} at ${currentTime}`);
      } else {
        // ALREADY COMPLETED TODAY
        setLastScanResult({
          worker: matchedWorker,
          match,
          action: 'completed',
          timestamp: existingRecord.checkOut || currentTime,
        });
        setToastMessage(`Notice: Attendance for ${matchedWorker.name} already completed today.`);
      }
    } catch (err: any) {
      console.error('Frame processing error:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [cameraState, isScanningActive, enrolledProfiles, workers, currentUser, attendance, assignments, registerOrUpdateAttendance]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Trigger frame scanner every 600ms while camera is active
  useEffect(() => {
    if (cameraState === 'active' && isScanningActive) {
      scanLoopRef.current = setInterval(() => {
        processFrame();
      }, 600);
    } else {
      if (scanLoopRef.current) clearInterval(scanLoopRef.current);
    }

    return () => {
      if (scanLoopRef.current) clearInterval(scanLoopRef.current);
    };
  }, [cameraState, isScanningActive, processFrame]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} type="success" />}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/attendance" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs">
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Face Recognition Terminal</h1>
            <p className="text-xs text-slate-500">Contactless facial biometric attendance check-in &amp; check-out gate monitor.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Enrolled Profiles: {enrolledProfiles.length}
          </span>
        </div>
      </div>

      {/* Camera Viewport & Recognition Screen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Camera Feed Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border-2 border-slate-800 shadow-xl min-h-[320px]">
            {cameraState === 'active' ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />
                {/* Visual Overlay Scan Frame */}
                <div className="absolute inset-8 border-2 border-dashed border-cyan-400/70 rounded-3xl pointer-events-none flex flex-col items-center justify-between p-4 shadow-inner">
                  <div className="w-full flex justify-between text-[10px] font-black text-cyan-300 bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                    <span>LIVE SCANNER</span>
                    <span>128D BIOMETRICS</span>
                  </div>
                  <div className="w-full text-center">
                    <span className="text-[11px] font-bold text-white bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-400/40">
                      {cameraMessage}
                    </span>
                  </div>
                </div>
              </>
            ) : cameraState === 'loading' ? (
              <div className="flex flex-col items-center space-y-3 z-10 p-6 text-center">
                <Scan className="h-12 w-12 text-cyan-400 animate-pulse" />
                <p className="text-xs font-semibold text-cyan-300">{cameraMessage}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 z-10 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-amber-400" />
                <p className="text-xs font-bold text-slate-200 max-w-xs">{cameraMessage}</p>
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <Link
                    to="/attendance/manual"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Manual Attendance
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Recognition Result Card Column */}
        <div className="flex flex-col justify-between bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3">
            <UserCheck className="h-4 w-4 text-cyan-600" />
            <span>Terminal Scan Output</span>
          </div>

          {lastScanResult ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto overflow-hidden border-2 border-cyan-500 shadow-xs flex items-center justify-center">
                  {lastScanResult.worker.photoUrl ? (
                    <img src={lastScanResult.worker.photoUrl} alt={lastScanResult.worker.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-slate-700">{lastScanResult.worker.name.charAt(0)}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{lastScanResult.worker.name}</h3>
                  <p className="text-xs font-semibold text-cyan-700">Worker ID: {lastScanResult.worker.id}</p>
                </div>

                <div className="text-left bg-white border border-slate-200 p-2.5 rounded-lg space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Site / Section:</span>
                    <span className="font-bold text-slate-900">{lastScanResult.worker.currentSiteId} / {lastScanResult.worker.currentSectionId || 'General'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Match Confidence:</span>
                    <span className="font-bold text-emerald-600">{lastScanResult.match.confidence}% (L2: {lastScanResult.match.distance.toFixed(3)})</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Scan Time (IST):</span>
                    <span className="font-bold text-slate-900">{lastScanResult.timestamp}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="pt-1">
                  {lastScanResult.action === 'in' && (
                    <span className="w-full py-2 px-3 bg-emerald-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-xs">
                      <LogIn className="h-4 w-4" />
                      <span>✓ TIME IN SUCCESSFUL</span>
                    </span>
                  )}
                  {lastScanResult.action === 'out' && (
                    <span className="w-full py-2 px-3 bg-indigo-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-xs">
                      <LogOut className="h-4 w-4" />
                      <span>✓ TIME OUT SUCCESSFUL</span>
                    </span>
                  )}
                  {lastScanResult.action === 'completed' && (
                    <span className="w-full py-2 px-3 bg-slate-700 text-slate-100 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Attendance Already Completed</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-8 text-slate-400">
              <Scan className="h-12 w-12 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Waiting for employee face scan...</p>
              <p className="text-[11px] text-slate-400 max-w-[200px]">
                Enrolled workers walking up to the camera will be automatically recognized.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
