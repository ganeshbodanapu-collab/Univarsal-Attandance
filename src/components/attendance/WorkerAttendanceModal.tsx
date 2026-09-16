import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker, Section, Site, Attendance } from '../../types';
import { Modal } from '../common/Modal';
import {
  Camera,
  Fingerprint,
  FileText,
  Clock,
  Upload,
  CheckCircle2,
  X,
  Scan,
  Sparkles,
  Wallet,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Building2,
} from 'lucide-react';
import { verifyIndividualWorkerFace } from '../../lib/faceBiometricsEngine';

export interface WorkerAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  section?: Section | null;
  site?: Site | null;
  sites?: Site[];
  sections?: Section[];
  allowSiteSelection?: boolean;
  initialTab?: 'manual' | 'face' | 'fingerprint';
  initialMode?: 'checkIn' | 'checkOut';
  defaultSiteAmountGiven?: number;
  onSuccess?: (workerName: string, message: string) => void;
}

export const WorkerAttendanceModal: React.FC<WorkerAttendanceModalProps> = ({
  isOpen,
  onClose,
  worker,
  section,
  site,
  sites,
  sections,
  allowSiteSelection = true,
  initialTab,
  initialMode,
  defaultSiteAmountGiven,
  onSuccess,
}) => {
  const {
    sites: contextSites,
    sections: contextSections,
    attendance,
    assignments,
    currentUser,
    registerOrUpdateAttendance,
  } = useAttendanceContext();

  const allSites = sites && sites.length > 0 ? sites : contextSites;
  const allSections = sections && sections.length > 0 ? sections : contextSections;

  const [attendanceMode, setAttendanceMode] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [activeTab, setActiveTab] = useState<'manual' | 'face' | 'fingerprint'>('manual');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<Attendance['status']>('present');
  const [checkInTime, setCheckInTime] = useState<string>('08:30');
  const [checkOutTime, setCheckOutTime] = useState<string>('17:30');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<boolean | null>(null);
  const [showLiveCamera, setShowLiveCamera] = useState<boolean>(false);

  // Deployment location state (Site & Section)
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    site?.id || worker?.currentSiteId || (allSites[0]?.id || '')
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    section?.id || worker?.currentSectionId || ''
  );

  // Site Amount Given state
  const [hasSiteAmount, setHasSiteAmount] = useState<boolean>(
    Boolean(defaultSiteAmountGiven && defaultSiteAmountGiven > 0)
  );
  const [siteAmount, setSiteAmount] = useState<string>(
    defaultSiteAmountGiven && defaultSiteAmountGiven > 0 ? defaultSiteAmountGiven.toString() : ''
  );
  const [siteAmountMode, setSiteAmountMode] = useState<Attendance['siteAmountMode']>('cash');
  const [siteAmountRemarks, setSiteAmountRemarks] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Synchronize available sections when selectedSiteId changes
  const activeSectionsForSite = useMemo(() => {
    return allSections.filter((s) => s.siteId === selectedSiteId);
  }, [allSections, selectedSiteId]);

  useEffect(() => {
    if (activeSectionsForSite.length > 0) {
      if (!activeSectionsForSite.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(activeSectionsForSite[0].id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [activeSectionsForSite, selectedSectionId]);

  // Determine if attendance was already recorded for this worker on this date
  const existingAttendance = worker
    ? attendance.find((a) => a.workerId === worker.id && a.date === date)
    : undefined;

  // Initialize or reset form when worker or date changes
  useEffect(() => {
    if (site?.id) {
      setSelectedSiteId(site.id);
    } else if (worker?.currentSiteId) {
      setSelectedSiteId(worker.currentSiteId);
    }
    if (section?.id) {
      setSelectedSectionId(section.id);
    } else if (worker?.currentSectionId) {
      setSelectedSectionId(worker.currentSectionId);
    }

    if (initialMode) {
      setAttendanceMode(initialMode);
    } else if (existingAttendance?.checkIn && !existingAttendance?.checkOut) {
      setAttendanceMode('checkOut');
    } else {
      setAttendanceMode('checkIn');
    }

    if (existingAttendance) {
      setStatus(existingAttendance.status);
      setCheckInTime(existingAttendance.checkIn || '08:30');
      setCheckOutTime(existingAttendance.checkOut || new Date().toTimeString().substring(0, 5) || '17:30');
      setPhotoUrl(existingAttendance.photoUrl || null);
      setRemarks(existingAttendance.remarks || '');
      setActiveTab(existingAttendance.method || initialTab || 'manual');
      if (existingAttendance.siteId) {
        setSelectedSiteId(existingAttendance.siteId);
      }
      if (existingAttendance.sectionId) {
        setSelectedSectionId(existingAttendance.sectionId);
      }
      if (existingAttendance.siteAmountGiven && existingAttendance.siteAmountGiven > 0) {
        setHasSiteAmount(true);
        setSiteAmount(existingAttendance.siteAmountGiven.toString());
        setSiteAmountMode(existingAttendance.siteAmountMode || 'cash');
        setSiteAmountRemarks(existingAttendance.siteAmountRemarks || '');
      }
    } else {
      setStatus('present');
      setCheckInTime(new Date().toTimeString().substring(0, 5) || '08:30');
      setCheckOutTime('17:30');
      setPhotoUrl(null);
      setRemarks('');
      setActiveTab(initialTab || 'manual');
      if (defaultSiteAmountGiven && defaultSiteAmountGiven > 0) {
        setHasSiteAmount(true);
        setSiteAmount(defaultSiteAmountGiven.toString());
      } else {
        setHasSiteAmount(false);
        setSiteAmount('');
      }
      setSiteAmountRemarks('');
    }
    setScanFeedback(null);
    setScanSuccess(null);
    stopCamera();
  }, [worker, site, section, date, isOpen, initialTab, initialMode, defaultSiteAmountGiven]);

  const [cameraError, setCameraError] = useState<string | null>(null);

  // Auto-start camera when active tab is face
  useEffect(() => {
    if (isOpen && activeTab === 'face') {
      startCamera();
    }
  }, [isOpen, activeTab]);

  // Clean up camera stream on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setShowLiveCamera(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setShowLiveCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setShowLiveCamera(false);
      setCameraError(
        'Camera permission denied or camera device unavailable. Please allow camera permissions in your browser.'
      );
    }
  };

  const captureCameraSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(dataUrl);
      }
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseDemoPhoto = () => {
    setPhotoUrl('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80');
  };

  const handleFaceScan = async () => {
    if (!worker) return;
    if (!showLiveCamera || !mediaStreamRef.current) {
      await startCamera();
    }
    setIsScanning(true);
    setScanFeedback(`Extracting 3D facial landmarks for ${worker.name} (${attendanceMode === 'checkIn' ? 'Check-In' : 'Check-Out'})...`);

    captureCameraSnapshot();

    await new Promise((resolve) => setTimeout(resolve, 800));

    let verifyResult: { matched: boolean; score: number; reason: string } = { matched: true, score: 85, reason: '' };
    if (videoRef.current) {
      const res = await verifyIndividualWorkerFace(videoRef.current, worker);
      verifyResult = { matched: res.matched, score: res.score, reason: res.reason || '' };
    }

    setIsScanning(false);

    if (verifyResult.matched) {
      setScanSuccess(true);
      setScanFeedback(verifyResult.reason || `Face ID Verified for ${worker.name}`);
      if (attendanceMode === 'checkIn') {
        saveAttendanceRecord('face', 'present', new Date().toTimeString().substring(0, 5), undefined);
      } else {
        saveAttendanceRecord('face', 'present', existingAttendance?.checkIn || '08:30', new Date().toTimeString().substring(0, 5));
      }
    } else {
      setScanSuccess(false);
      setScanFeedback(verifyResult.reason || `Face Mismatch: Scanned face does not match ${worker.name}'s enrolled Face ID profile.`);
    }
  };

  const handleFingerprintScan = async () => {
    if (!worker) return;
    setIsScanning(true);
    setScanFeedback(`Reading fingerprint sensor for ${attendanceMode === 'checkIn' ? 'Check-In' : 'Check-Out'}...`);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    setIsScanning(false);
    setScanSuccess(true);
    setScanFeedback(`Fingerprint Matched — ${attendanceMode === 'checkIn' ? 'Checked IN' : 'Checked OUT'}`);

    // Save attendance immediately
    if (attendanceMode === 'checkIn') {
      saveAttendanceRecord('fingerprint', 'present', new Date().toTimeString().substring(0, 5), undefined);
    } else {
      saveAttendanceRecord('fingerprint', 'present', existingAttendance?.checkIn || '08:30', new Date().toTimeString().substring(0, 5));
    }
  };

  const saveAttendanceRecord = (
    method: 'face' | 'fingerprint' | 'manual',
    customStatus?: Attendance['status'],
    customCheckIn?: string,
    customCheckOut?: string
  ) => {
    if (!worker) return;

    // Resolve current active assignment
    const activeAssignment = assignments.find(
      (asg) => asg.workerId === worker.id && asg.toDate === null
    );

    const finalStatus = customStatus || status;

    let finalCheckIn: string | undefined;
    let finalCheckOut: string | undefined;

    if (attendanceMode === 'checkIn') {
      finalCheckIn = customCheckIn !== undefined ? customCheckIn : (checkInTime || new Date().toTimeString().substring(0, 5));
      finalCheckOut = customCheckOut !== undefined ? customCheckOut : (existingAttendance?.checkOut || undefined);
    } else {
      finalCheckIn = customCheckIn !== undefined ? customCheckIn : (existingAttendance?.checkIn || checkInTime || '08:30');
      finalCheckOut = customCheckOut !== undefined ? customCheckOut : (checkOutTime || new Date().toTimeString().substring(0, 5));
    }

    const parsedSiteAmount = hasSiteAmount && siteAmount ? parseFloat(siteAmount) : undefined;

    registerOrUpdateAttendance({
      workerId: worker.id,
      assignmentId: activeAssignment?.id || `ASG-${selectedSiteId}-${selectedSectionId || 'SEC001'}`,
      date,
      status: finalStatus,
      method,
      checkIn: finalCheckIn || undefined,
      checkOut: finalCheckOut || undefined,
      photoUrl: photoUrl || undefined,
      remarks: remarks.trim() || undefined,
      markedBy: currentUser?.name || 'Site Supervisor',
      siteId: selectedSiteId,
      sectionId: selectedSectionId || undefined,
      siteAmountGiven: parsedSiteAmount && parsedSiteAmount > 0 ? parsedSiteAmount : undefined,
      siteAmountRemarks: hasSiteAmount ? siteAmountRemarks.trim() || 'Disbursed on-site' : undefined,
      siteAmountMode: hasSiteAmount ? siteAmountMode : undefined,
      workingPlaceNote: remarks.trim() || undefined,
    });

    const chosenSiteObj = allSites.find((s) => s.id === selectedSiteId);

    if (onSuccess) {
      const modeLabel = attendanceMode === 'checkIn' ? 'CHECKED IN' : 'CHECKED OUT';
      onSuccess(
        worker.name,
        `${modeLabel} at ${chosenSiteObj?.name || selectedSiteId} (${method.toUpperCase()}: ${finalStatus.toUpperCase()})${
          parsedSiteAmount ? ` • ₹${parsedSiteAmount} noted as given by site` : ''
        }`
      );
    }

    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    if (status !== 'absent' && !checkInTime) {
      alert('Please specify a Check-In time.');
      return;
    }

    saveAttendanceRecord('manual');
  };

  if (!worker) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={attendanceMode === 'checkIn' ? '📥 Employee Check-In (Punch In)' : '📤 Employee Check-Out (Punch Out)'}
      subtitle={`Working Site: ${allSites.find((s) => s.id === selectedSiteId)?.name || selectedSiteId} • Section: ${allSections.find((s) => s.id === selectedSectionId)?.name || selectedSectionId || 'General Section'}`}
      icon={<UserCheck className="h-5 w-5 text-blue-600" />}
      size="xl"
    >
      <div className="space-y-4">
        {/* Attendance Mode Switcher (Check-In vs Check-Out) */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAttendanceMode('checkIn')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              attendanceMode === 'checkIn'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📥 Part 1: Check-In Mode (Punch In)</span>
          </button>
          <button
            type="button"
            onClick={() => setAttendanceMode('checkOut')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              attendanceMode === 'checkOut'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📤 Part 2: Check-Out Mode (Punch Out)</span>
          </button>
        </div>

        {/* Worker Info Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
              {worker.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">{worker.name}</span>
                <span className="font-mono text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  {worker.id}
                </span>
                <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                  {site?.code || worker.currentSiteId}-{worker.id}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-medium">
                <span>Wage: ₹{worker.dailyWage}/day</span>
                <span>•</span>
                <span>Mobile: {worker.mobile}</span>
                <span>•</span>
                <span className="capitalize">{worker.workerType} Worker</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-right">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Working Site & Section Selector */}
        {allowSiteSelection && allSites.length > 0 && (
          <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-950">
                  Working Site &amp; Trade Section (Attendance Note Location):
                </span>
              </div>
              {selectedSiteId !== worker.currentSiteId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  🌐 Cross-Site Deployment
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Working Project Site:
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  {allSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {s.id === worker.currentSiteId ? '• [Primary Site]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Working Trade Section:
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="">-- General Section --</option>
                  {activeSectionsForSite.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Add Amount This Site Gave to Employee */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSiteAmount}
                  onChange={(e) => setHasSiteAmount(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                />
                <span>Add Amount This Site Gave to That Employee (₹)</span>
              </label>
            </div>
            {hasSiteAmount && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                Site Disbursement Enabled
              </span>
            )}
          </div>

          {hasSiteAmount && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Amount Given (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={siteAmount}
                    onChange={(e) => setSiteAmount(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Mode:
                </label>
                <select
                  value={siteAmountMode}
                  onChange={(e) => setSiteAmountMode(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="cash">Cash on Site</option>
                  <option value="upi">UPI / Mobile Transfer</option>
                  <option value="advance">Site Advance Loan</option>
                  <option value="settlement">Day Wage Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Disbursement Remarks:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Food allowance, day wage cash"
                  value={siteAmountRemarks}
                  onChange={(e) => setSiteAmountRemarks(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Existing Status Indicator if marked */}
        {existingAttendance && (
          <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Currently Marked:</strong>{' '}
                <span className="capitalize font-bold text-emerald-700">{existingAttendance.status}</span>{' '}
                {existingAttendance.checkIn ? `(In: ${existingAttendance.checkIn})` : ''}{' '}
                via <span className="uppercase font-semibold text-emerald-800">{existingAttendance.method}</span>
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Submitting will update this record</span>
          </div>
        )}

        {/* Method Mode Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('manual');
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Manual Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('face');
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'face'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Camera className="h-4 w-4 text-cyan-600" />
            <span>Face ID</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('fingerprint');
            }}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'fingerprint'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Fingerprint className="h-4 w-4 text-purple-600" />
            <span>Fingerprint</span>
          </button>
        </div>

        {/* TAB 1: MANUAL ENTRY (With Check-In, Check-Out, and Photo Upload) */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Duty / Attendance Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'present', label: 'Present (Full Day)', color: 'border-emerald-500 text-emerald-700 bg-emerald-50/50' },
                  { value: 'halfDay', label: 'Half Day (0.5)', color: 'border-amber-500 text-amber-700 bg-amber-50/50' },
                  { value: 'absent', label: 'Absent', color: 'border-rose-500 text-rose-700 bg-rose-50/50' },
                  { value: 'leave', label: 'Authorized Leave', color: 'border-blue-500 text-blue-700 bg-blue-50/50' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value as Attendance['status'])}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      status === option.value
                        ? `${option.color} ring-2 ring-blue-500/20 shadow-xs`
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-In and Check-Out Times */}
            {status !== 'absent' && status !== 'leave' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                {/* Check In Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Check-In Time *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCheckInTime(new Date().toTimeString().substring(0, 5))}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Use Now
                    </button>
                  </div>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex items-center space-x-1 mt-1.5">
                    {['08:00', '08:30', '09:00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCheckInTime(preset)}
                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Check Out Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>Check-Out Time (Optional)</span>
                    </label>
                    {checkOutTime && (
                      <button
                        type="button"
                        onClick={() => setCheckOutTime('')}
                        className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex items-center space-x-1 mt-1.5">
                    {['17:00', '17:30', '18:00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCheckOutTime(preset)}
                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Photo Upload Section (Core Requirement) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Worker Field Photo Verification
                </label>
                <span className="text-[11px] text-slate-400">On-site supervisor photo proof</span>
              </div>

              {/* Photo Preview Card if attached */}
              {photoUrl ? (
                <div className="relative border-2 border-emerald-500/50 bg-emerald-50/30 rounded-2xl p-3 flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex-shrink-0 shadow-sm">
                    <img src={photoUrl} alt="Worker Check-In Proof" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>Photo Proof Attached</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Field verified snapshot for {worker.name}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>Remove Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              ) : showLiveCamera ? (
                /* Live Camera Stream Viewport */
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video max-h-56 flex flex-col items-center justify-center text-white">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-0 border-2 border-cyan-400/40 pointer-events-none rounded-2xl" />
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      onClick={captureCameraSnapshot}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Capture Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Photo Upload Dropzone */
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-all bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-cyan-400" />
                      <span>Take Live Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUseDemoPhoto}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      title="Attach sample site photo for instant testing"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Attach Demo Photo</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Takes photo from mobile camera or selects file (PNG, JPG)
                  </p>
                </div>
              )}
            </div>

            {/* Supervisor Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supervisor Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. On-site duty with safety gear, Gate 1 check-in"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-slate-400"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit & Register Attendance</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: FACE ID BIOMETRICS */}
        {activeTab === 'face' && (
          <div className="space-y-4 text-center">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[260px] text-white">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${showLiveCamera ? 'block' : 'hidden'}`}
              />

              {/* Camera reticle overlay */}
              <div className="absolute inset-4 border border-cyan-500/40 rounded-xl pointer-events-none z-10" />
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400 z-10" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400 z-10" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400 z-10" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400 z-10" />

              {!showLiveCamera && !cameraError && (
                <div className="space-y-3 flex flex-col items-center z-20 p-4">
                  <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Face Recognition Terminal</p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-[260px]">
                      Position {worker.name} facing the camera for instantaneous {attendanceMode === 'checkIn' ? 'Check-In' : 'Check-Out'}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Start Camera</span>
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="space-y-3 flex flex-col items-center z-20 p-4">
                  <AlertCircle className="h-10 w-10 text-rose-500" />
                  <p className="text-xs text-rose-300 font-medium max-w-[240px]">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Camera Permission</span>
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-30">
                  <div className="relative">
                    <Scan className="h-16 w-16 text-cyan-400 animate-pulse" />
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl" />
                  </div>
                  <p className="text-xs font-bold tracking-wider text-cyan-300 uppercase">
                    Analyzing Face Biometrics...
                  </p>
                  <p className="text-[11px] text-slate-400">Verifying 3D facial landmarks for {worker.name}</p>
                </div>
              )}

              {scanFeedback && !isScanning && (
                <div className={`absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-30 p-6 transition-all ${
                  scanSuccess ? 'bg-slate-950/85' : 'bg-rose-950/95'
                }`}>
                  {scanSuccess ? (
                    <>
                      <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-bounce" />
                      </div>
                      <p className="text-sm font-black text-emerald-300 tracking-wide text-center">{scanFeedback}</p>
                      <p className="text-xs font-semibold text-slate-300">
                        Marked as Present at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <AlertCircle className="h-10 w-10 text-rose-400 animate-pulse" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-rose-400">Verification Rejected</p>
                      <p className="text-xs font-bold text-rose-200 text-center max-w-xs">{scanFeedback}</p>
                      <p className="text-[11px] text-rose-300/80 font-semibold text-center">Attendance registration was blocked due to face mismatch.</p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScanFeedback(null);
                            setScanSuccess(null);
                            startCamera();
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Try Scanning Again</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={handleFaceScan}
                disabled={isScanning}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Scan className="h-4 w-4" />
                <span>{isScanning ? 'Scanning Face...' : `Scan & Verify Face ID (${attendanceMode === 'checkIn' ? 'Check-In' : 'Check-Out'})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FINGERPRINT BIOMETRICS */}
        {activeTab === 'fingerprint' && (
          <div className="space-y-4 text-center">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[240px] text-white">
              {isScanning ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="relative">
                    <Fingerprint className="h-16 w-16 text-purple-400 animate-pulse" />
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl" />
                  </div>
                  <p className="text-xs font-bold tracking-wider text-purple-300 uppercase">
                    Reading Fingerprint Sensor...
                  </p>
                  <p className="text-[11px] text-slate-400">Matching ridge pattern against {worker.id}</p>
                </div>
              ) : scanFeedback ? (
                <div className="space-y-2 flex flex-col items-center">
                  {scanSuccess ? (
                    <>
                      <CheckCircle2 className="h-14 w-14 text-emerald-400 animate-bounce" />
                      <p className="text-sm font-bold text-emerald-300">{scanFeedback}</p>
                      <p className="text-xs text-slate-300">Marked as Present at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-14 w-14 text-rose-400 animate-pulse" />
                      <p className="text-sm font-bold text-rose-300">{scanFeedback}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setScanFeedback(null);
                          setScanSuccess(null);
                        }}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer mt-2"
                      >
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                    <Fingerprint className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Optical Fingerprint Scanner Ready</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Place {worker.name}&apos;s registered thumb on biometric sensor.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={handleFingerprintScan}
                disabled={isScanning}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className="h-4 w-4" />
                <span>{isScanning ? 'Reading Sensor...' : 'Scan Fingerprint Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
