import React, { useState, useEffect } from 'react';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Worker } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Edit3,
  Trash2,
  CheckCircle2,
  Building2,
  Phone,
  DollarSign,
  User,
  Briefcase,
} from 'lucide-react';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker | null;
  onSuccess?: (updated: Worker) => void;
  onDeleted?: (deletedWorkerId: string) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  worker,
  onSuccess,
  onDeleted,
}) => {
  const { sites, sections, updateWorker, deleteWorker, currentUser } = useAttendanceContext();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [mobile, setMobile] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [workerType, setWorkerType] = useState<'company' | 'outside'>('company');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [remarks, setRemarks] = useState('');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state with selected worker
  useEffect(() => {
    if (worker) {
      setName(worker.name || '');
      setPurpose(worker.designation || worker.purpose || '');
      setMobile(worker.mobile || '');
      setDailyWage(String(worker.dailyWage || ''));
      setWorkerType(worker.workerType || 'company');
      setSelectedSiteId(worker.currentSiteId || '');
      setSelectedSectionId(worker.currentSectionId || '');
      setIdProofNumber(worker.idProofNumber || '');
      setEmergencyContact(worker.emergencyContact || '');
      setRemarks(worker.remarks || '');
    }
  }, [worker, isOpen]);

  if (!worker) return null;

  const handleSiteChange = (newSiteId: string) => {
    setSelectedSiteId(newSiteId);
    const siteSecs = sections.filter((s) => s.siteId === newSiteId && s.status === 'active');
    if (siteSecs.length > 0) {
      setSelectedSectionId(siteSecs[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  const availableSections = sections.filter((s) => s.siteId === selectedSiteId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter employee name.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum <= 0) {
      alert('Please specify a positive daily wage rate.');
      return;
    }
    if (!selectedSiteId) {
      alert('Please select a project site.');
      return;
    }
    if (!selectedSectionId) {
      alert('Please select a work trade section.');
      return;
    }

    const updated: Worker = {
      ...worker,
      name: name.trim(),
      designation: purpose.trim() || undefined,
      purpose: purpose.trim() || undefined,
      mobile: mobile.trim(),
      dailyWage: wageNum,
      workerType,
      currentSiteId: selectedSiteId,
      currentSectionId: selectedSectionId,
      idProofNumber: idProofNumber.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      remarks: remarks.trim() || undefined,
    };

    updateWorker(updated);
    if (onSuccess) onSuccess(updated);
    onClose();
  };

  const handleConfirmDelete = () => {
    deleteWorker(worker.id);
    setShowDeleteConfirm(false);
    if (onDeleted) onDeleted(worker.id);
    onClose();
  };

  const activeSiteObj = sites.find((s) => s.id === selectedSiteId);
  const activeSecObj = sections.find((s) => s.id === selectedSectionId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Employee Profile & Details"
        subtitle={`Admin Management • Permanent ID: ${worker.id} • Serial: ${worker.serialNumber || worker.id}`}
        icon={<Edit3 className="h-5 w-5 text-blue-600" />}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Identity & Current Badge Banner */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300 block">
                Official Employee Identity
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-base sm:text-lg font-black text-white">
                  {worker.id}
                </span>
                {worker.serialNumber && (
                  <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 font-mono">
                    Serial: {worker.serialNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-200 mt-1">
                Current: <strong className="text-white">{activeSiteObj?.name || worker.currentSiteId}</strong> &bull; <strong className="text-white">{activeSecObj?.name || worker.currentSectionId}</strong>
              </p>
            </div>

            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Admin Privilege
            </span>
          </div>

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <User className="h-4 w-4 text-blue-600" />
              <span>Personal & Contact Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sanjay Verma"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Employee Work Purpose / Role / Designation */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Briefcase className="h-3.5 w-3.5 text-blue-600 mr-1 inline" />
                    <span>Employee Work Purpose / Role / Designation</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Auto-updates in Reports</span>
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Senior Mason, Barbender, Carpenter, Tile Layer, Helper, Site Supervisor"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This purpose/designation automatically reflects across all 6 reporting hubs, custom audit slips, and muster rolls.
                </span>
              </div>

              {/* Daily Wage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Wage Rate (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={1}
                    value={dailyWage}
                    onChange={(e) => setDailyWage(e.target.value)}
                    placeholder="850"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Worker Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Worker Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkerType('company')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      workerType === 'company'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Company Worker
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerType('outside')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      workerType === 'outside'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Outside Contractor
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Site & Section Assignment */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Project Site &amp; Trade Section Deployment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Site <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trade Section <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer"
                >
                  {availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.code}) &bull; {sec.inCharge}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Identity & Emergency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aadhaar Card / ID Proof Number
              </label>
              <input
                type="text"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                placeholder="XXXX XXXX XXXX"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Contact Number
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. 9812345699 (Brother)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Admin Remarks / Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Senior mason. Reassigned to Sector 4 tower."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            {currentUser?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>Delete Employee</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Employee Record"
        message={`Are you sure you want to permanently delete employee "${worker.name}" (${worker.id})? All associated attendance logs, advances, and ledger history will be permanently erased.`}
        confirmText="Delete Employee Permanently"
        variant="danger"
      />
    </>
  );
};
