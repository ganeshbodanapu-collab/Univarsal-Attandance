import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Scan, CheckCircle2, AlertTriangle, ShieldOff, Sparkles, RefreshCw } from 'lucide-react';
import type { Worker } from '../../types';
import { detectSingleFace, loadFaceApiModels } from '../../lib/faceRecognitionEngine';
import { faceProfilesDataService } from '../../lib/data/faceProfiles';
import { useAttendanceContext } from '../../context/AttendanceContext';

export interface EnrollFaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  onEnrolledSuccess?: (workerId: string) => void;
}

export const EnrollFaceModal: React.FC<EnrollFaceModalProps> = ({
  isOpen,
  onClose,
  worker,
  onEnrolledSuccess,
}) => {
  const { updateWorker, currentUser } = useAttendanceContext();

  const [step, setStep] = useState<'camera' | 'capturing' | 'success' | 'error'>('camera');
  const [feedback, setFeedback] = useState<string>('Initializing camera & face engine...');
  const [samples, setSamples] = useState<number[][]>([]);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0); // 0: Front, 1: Slight Left, 2: Slight Right
  const [enrolledResult, setEnrolledResult] = useState<{ workerName: string; workerId: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);

  // Sample angle prompts
  const samplePrompts = [
    { title: 'Sample 1 of 3: Look Directly Front', detail: 'Keep face straight facing the camera' },
    { title: 'Sample 2 of 3: Turn Slightly Left', detail: 'Tilt head slightly to your left side' },
    { title: 'Sample 3 of 3: Turn Slightly Right', detail: 'Tilt head slightly to your right side' },
  ];

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      setFeedback('Loading AI Face Engine models...');
      await loadFaceApiModels();

      setFeedback('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStep('camera');
      setFeedback(samplePrompts[0].title);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setStep('error');
      setFeedback('Camera unavailable. Please check browser permissions.');
    }
  };

  useEffect(() => {
    if (isOpen && worker) {
      setStep('camera');
      setSamples([]);
      setCurrentSampleIndex(0);
      setEnrolledResult(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, worker]);

  // Capture face sample for current angle
  const handleCaptureSample = async () => {
    if (!videoRef.current || !worker) return;

    try {
      setFeedback(`Analyzing face sample ${currentSampleIndex + 1}...`);
      const detection = await detectSingleFace(videoRef.current);

      if (detection.errorMessage || !detection.descriptor) {
        alert(detection.errorMessage || 'Failed to detect face clearly. Please try again.');
        return;
      }

      const newSamples = [...samples, detection.descriptor];
      setSamples(newSamples);

      if (currentSampleIndex < 2) {
        const nextIdx = currentSampleIndex + 1;
        setCurrentSampleIndex(nextIdx);
        setFeedback(samplePrompts[nextIdx].title);
      } else {
        // All 3 samples captured -> average descriptors and save!
        await finalizeEnrollment(newSamples);
      }
    } catch (err: any) {
      alert(`Capture error: ${err.message || String(err)}`);
    }
  };

  // Average 3 face descriptors and persist to Supabase
  const finalizeEnrollment = async (capturedSamples: number[][]) => {
    if (!worker) return;

    setStep('capturing');
    setFeedback('Generating 128D biometric vector & saving to Supabase...');

    // Compute element-wise average across samples
    const vectorLength = capturedSamples[0].length;
    const finalDescriptor: number[] = new Array(vectorLength).fill(0);

    for (let i = 0; i < vectorLength; i++) {
      let sum = 0;
      for (const s of capturedSamples) {
        sum += s[i];
      }
      finalDescriptor[i] = sum / capturedSamples.length;
    }

    const { success, error } = await faceProfilesDataService.saveFaceProfile(
      worker.id,
      worker.currentSiteId,
      worker.currentSectionId,
      finalDescriptor,
      currentUser?.name || 'Site Supervisor'
    );

    if (success) {
      // Update worker state in context
      updateWorker({ ...worker, faceEnrolled: true });
      setEnrolledResult({ workerName: worker.name, workerId: worker.id });
      setStep('success');
      stopCamera();
      if (onEnrolledSuccess) onEnrolledSuccess(worker.id);
    } else {
      setStep('error');
      setFeedback(`Failed to save face profile: ${error || 'Unknown error'}`);
    }
  };

  // Disable Face ID for worker
  const handleDisableFace = async () => {
    if (!worker) return;
    if (!window.confirm(`Are you sure you want to disable Face ID for ${worker.name}?`)) return;

    const { success, error } = await faceProfilesDataService.disableFaceProfile(worker.id);
    if (success) {
      updateWorker({ ...worker, faceEnrolled: false });
      alert(`Face ID disabled for ${worker.name}.`);
      onClose();
    } else {
      alert(`Error disabling face profile: ${error}`);
    }
  };

  if (!isOpen || !worker) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Face ID Registration — ${worker.name}`}>
      <div className="space-y-5 py-1">
        {/* Worker Info Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-cyan-300">{worker.name}</span>
              <span className="text-xs text-slate-400">({worker.id})</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Site: {worker.currentSiteId} • Section: {worker.currentSectionId || 'General'}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                worker.faceEnrolled ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}
            >
              {worker.faceEnrolled ? '✓ Enrolled' : 'Not Enrolled'}
            </span>
          </div>
        </div>

        {step === 'camera' && (
          <div className="space-y-4">
            {/* Live Camera Viewport */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-video relative flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />

              {/* Holographic Face Frame Guide */}
              <div className="absolute inset-8 border-2 border-dashed border-cyan-400/60 rounded-3xl pointer-events-none flex flex-col items-center justify-between p-4">
                <span className="text-[11px] font-extrabold text-cyan-300 bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-400/40">
                  {samplePrompts[currentSampleIndex]?.title}
                </span>
                <span className="text-[10px] text-slate-300 bg-slate-950/80 px-2.5 py-0.5 rounded-md">
                  {samplePrompts[currentSampleIndex]?.detail}
                </span>
              </div>
            </div>

            {/* Instruction feedback */}
            <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-600 animate-spin" />
              <span>{feedback}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleCaptureSample}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                <Scan className="h-4 w-4" />
                <span>Capture {samplePrompts[currentSampleIndex]?.title.split(':')[0]}</span>
              </button>

              {worker.faceEnrolled && (
                <button
                  type="button"
                  onClick={handleDisableFace}
                  className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <ShieldOff className="h-4 w-4" />
                  <span>Disable Face</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'capturing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <Scan className="h-16 w-16 text-cyan-600 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900">{feedback}</h3>
            <p className="text-xs text-slate-500">Storing biometric landmarks securely in Supabase DB...</p>
          </div>
        )}

        {step === 'success' && enrolledResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-lg font-black text-emerald-900">FACE ENROLLMENT SUCCESSFUL</h3>
              <p className="text-xs text-emerald-700 mt-1">Biometric face descriptor mapped to worker ID.</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto text-xs font-semibold">
              <div className="flex justify-between border-b pb-1 text-slate-700">
                <span>Worker Name:</span>
                <span className="font-bold text-slate-900">{enrolledResult.workerName}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-slate-700">
                <span>Worker ID:</span>
                <span className="font-bold text-slate-900">{enrolledResult.workerId}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Face Status:</span>
                <span className="font-black text-emerald-700">ENROLLED</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-red-900">Enrollment Error</h3>
              <p className="text-xs text-red-700 mt-1">{feedback}</p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
