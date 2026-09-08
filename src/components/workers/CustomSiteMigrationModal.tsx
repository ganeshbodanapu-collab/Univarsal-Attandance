import React, { useState, useEffect, useMemo } from 'react';
import type { Worker, Site, Section, SiteMigrationRecord } from '../../types';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { Modal } from '../common/Modal';
import {
  ArrowRightLeft,
  Building2,
  Layers,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Repeat,
  MapPin,
  User,
} from 'lucide-react';

export interface CustomSiteMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker?: Worker | null;
  allWorkers?: Worker[];
  sites: Site[];
  sections: Section[];
  onSuccess?: (message: string) => void;
}

export const CustomSiteMigrationModal: React.FC<CustomSiteMigrationModalProps> = ({
  isOpen,
  onClose,
  worker,
  allWorkers,
  sites,
  sections,
  onSuccess,
}) => {
  const { addSiteMigration, currentUser, workers: contextWorkers } = useAttendanceContext();
  const availableWorkers = allWorkers && allWorkers.length > 0 ? allWorkers : contextWorkers;

  // Selected Worker State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  // Transfer Mode: 'site' (Employees Site To Transfer) or 'section' (Section to Section Transfer)
  const [transferMode, setTransferMode] = useState<'site' | 'section'>('site');

  // Destination selections
  const [toSiteId, setToSiteId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [migrationType, setMigrationType] = useState<'temporary' | 'permanent'>('temporary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  // Active worker resolution
  useEffect(() => {
    if (isOpen) {
      if (worker) {
        setSelectedWorkerId(worker.id);
      } else if (availableWorkers.length > 0 && !selectedWorkerId) {
        setSelectedWorkerId(availableWorkers[0].id);
      }
    }
  }, [worker, availableWorkers, isOpen]);

  const activeWorker = useMemo(() => {
    return availableWorkers.find((w) => w.id === selectedWorkerId) || worker || availableWorkers[0] || null;
  }, [availableWorkers, selectedWorkerId, worker]);

  // Source site and section
  const sourceSite = sites.find((s) => s.id === activeWorker?.currentSiteId);
  const sourceSection = sections.find((s) => s.id === activeWorker?.currentSectionId);

  // Filter sections for destination site
  const destinationSections = useMemo(() => {
    const targetSiteId = transferMode === 'section' ? activeWorker?.currentSiteId : toSiteId;
    return sections.filter((sec) => sec.siteId === targetSiteId);
  }, [sections, toSiteId, transferMode, activeWorker]);

  // Initialize/reset destinations when worker or modal opens
  useEffect(() => {
    if (activeWorker && isOpen) {
      if (transferMode === 'site') {
        // Pick first alternative site as default destination
        const otherSites = sites.filter((s) => s.id !== activeWorker.currentSiteId);
        const defaultDest = otherSites[0]?.id || sites[0]?.id || '';
        setToSiteId(defaultDest);

        const destSecs = sections.filter((sec) => sec.siteId === defaultDest);
        setToSectionId(destSecs[0]?.id || '');
        setReason('Site Workload Balancing');
      } else {
        // Section to section transfer within same site
        setToSiteId(activeWorker.currentSiteId);
        const otherSecs = sections.filter(
          (sec) => sec.siteId === activeWorker.currentSiteId && sec.id !== activeWorker.currentSectionId
        );
        setToSectionId(otherSecs[0]?.id || sections.find((s) => s.siteId === activeWorker.currentSiteId)?.id || '');
        setReason('Trade Craft Reassignment');
      }

      setDate(new Date().toISOString().split('T')[0]);
      setMigrationType('temporary');
      setCustomReason('');
      setRemarks('');
      setApprovedBy(currentUser?.name || (currentUser?.role === 'admin' ? 'System Administrator' : 'Site Supervisor'));
    }
  }, [activeWorker, isOpen, transferMode, sites, sections, currentUser]);

  const handleModeChange = (newMode: 'site' | 'section') => {
    setTransferMode(newMode);
    if (!activeWorker) return;

    if (newMode === 'site') {
      const otherSites = sites.filter((s) => s.id !== activeWorker.currentSiteId);
      const defaultDest = otherSites[0]?.id || sites[0]?.id || '';
      setToSiteId(defaultDest);
      const destSecs = sections.filter((sec) => sec.siteId === defaultDest);
      setToSectionId(destSecs[0]?.id || '');
      setReason('Site Workload Balancing');
    } else {
      setToSiteId(activeWorker.currentSiteId);
      const otherSecs = sections.filter(
        (sec) => sec.siteId === activeWorker.currentSiteId && sec.id !== activeWorker.currentSectionId
      );
      setToSectionId(otherSecs[0]?.id || sections.find((s) => s.siteId === activeWorker.currentSiteId)?.id || '');
      setReason('Trade Craft Reassignment');
    }
  };

  const handleDestSiteChange = (newSiteId: string) => {
    setToSiteId(newSiteId);
    const destSecs = sections.filter((sec) => sec.siteId === newSiteId);
    setToSectionId(destSecs[0]?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorker) return;

    const finalToSiteId = transferMode === 'section' ? activeWorker.currentSiteId : toSiteId;

    if (!finalToSiteId || !toSectionId) {
      alert('Please select both a destination project site and target trade section.');
      return;
    }

    if (transferMode === 'site' && finalToSiteId === activeWorker.currentSiteId && toSectionId === activeWorker.currentSectionId) {
      alert('Destination Site & Section must be different from current assignment.');
      return;
    }

    if (transferMode === 'section' && toSectionId === activeWorker.currentSectionId) {
      alert('Target section must be different from the employee’s current section.');
      return;
    }

    const finalReason = customReason.trim()
      ? customReason.trim()
      : reason || (transferMode === 'section' ? 'Section Trade Transfer' : 'Site Migration');

    const migrationRecord: Omit<SiteMigrationRecord, 'id' | 'createdAt'> = {
      workerId: activeWorker.id,
      fromSiteId: activeWorker.currentSiteId,
      fromSectionId: activeWorker.currentSectionId,
      toSiteId: finalToSiteId,
      toSectionId,
      date,
      migrationType,
      reason: finalReason,
      approvedBy: approvedBy.trim() || currentUser?.name || 'Administrator',
      remarks: remarks.trim() || undefined,
    };

    addSiteMigration(migrationRecord);

    const destSiteObj = sites.find((s) => s.id === finalToSiteId);
    const destSecObj = sections.find((s) => s.id === toSectionId);

    if (onSuccess) {
      if (transferMode === 'section') {
        onSuccess(
          `✓ Employee ${activeWorker.name} transferred to ${destSecObj?.name || toSectionId} Section successfully!`
        );
      } else {
        onSuccess(
          `✓ Employee ${activeWorker.name} transferred to ${destSiteObj?.name || finalToSiteId} (${destSecObj?.name || toSectionId}) successfully!`
        );
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  const destSiteObj = sites.find((s) => s.id === (transferMode === 'section' ? activeWorker?.currentSiteId : toSiteId));
  const destSecObj = sections.find((s) => s.id === toSectionId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employees Transfer"
      subtitle={
        transferMode === 'site'
          ? `Cross-Site Transfer & Deployment: Relocate employee to another Project Site & Section`
          : `Section-to-Section Trade Transfer: Reassign employee to another trade craft within ${sourceSite?.name || 'current site'}`
      }
      icon={<ArrowRightLeft className="h-5 w-5 text-indigo-600" />}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top Worker Selection & Current Info Bar */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0">
                {activeWorker?.name ? activeWorker.name.charAt(0) : <User className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-sm font-bold text-slate-900">{activeWorker?.name || 'Select Employee'}</span>
                  {activeWorker?.id && (
                    <span className="font-mono text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {activeWorker.id}
                    </span>
                  )}
                  {(activeWorker?.designation || activeWorker?.purpose) && (
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200/60">
                      {activeWorker.designation || activeWorker.purpose}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current Home Site: <strong>{sourceSite?.name || activeWorker?.currentSiteId || '—'}</strong> &bull; Section:{' '}
                  <strong>{sourceSection?.name || activeWorker?.currentSectionId || '—'}</strong>
                </p>
              </div>
            </div>

            {/* Quick Switch Employee Dropdown if more than 1 worker */}
            {availableWorkers.length > 1 && (
              <div className="sm:max-w-xs w-full">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Change Employee to Transfer:
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                >
                  {availableWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id}) &bull; {w.designation || w.purpose || 'Worker'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TRANSFER TYPE / MODE SELECTOR: SITE TRANSFER VS SECTION TRANSFER          */}
        {/* ========================================================================= */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
            Select Transfer Option Type:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Employees Site To Transfer */}
            <button
              type="button"
              onClick={() => handleModeChange('site')}
              className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex items-start space-x-3 border ${
                transferMode === 'site'
                  ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  transferMode === 'site' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-900 tracking-tight">Employees Site To Transfer</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-200/70 text-indigo-900 uppercase">
                    Cross-Site
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Transfer employee to a different Project Site & select target trade section.
                </p>
              </div>
            </button>

            {/* Option 2: Section to Section Transfer */}
            <button
              type="button"
              onClick={() => handleModeChange('section')}
              className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer flex items-start space-x-3 border ${
                transferMode === 'section'
                  ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  transferMode === 'section' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-900 tracking-tight">Section to Section Transfer</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-200/70 text-purple-900 uppercase">
                    Trade Craft
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Reassign employee between trade crafts (e.g. Carpentry, Masonry, Electrical) on this site.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TRANSFER ROUTE VISUALIZER: CURRENT ORIGIN -> DESTINATION TARGET            */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. SOURCE (Current Origin) */}
          <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span>1. Current Origin:</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Site: {sourceSite?.name || activeWorker?.currentSiteId || '—'}</span>
              </p>
              <p className="text-slate-600 text-[11px] flex items-center space-x-1.5 font-medium">
                <Layers className="h-3.5 w-3.5 text-purple-500" />
                <span>Section: {sourceSection?.name || activeWorker?.currentSectionId || '—'}</span>
              </p>
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Site Code: {sourceSite?.code || 'SITE'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Section Code: {sourceSection?.code || 'SEC'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. DESTINATION (Target Route) */}
          <div
            className={`p-4 rounded-2xl space-y-2 border ${
              transferMode === 'site' ? 'bg-indigo-50/70 border-indigo-200/90' : 'bg-purple-50/70 border-purple-200/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider">
                <Repeat className={`h-3.5 w-3.5 ${transferMode === 'site' ? 'text-indigo-600' : 'text-purple-600'}`} />
                <span className={transferMode === 'site' ? 'text-indigo-900' : 'text-purple-900'}>
                  2. Destination Target:
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  transferMode === 'site' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {transferMode === 'site' ? 'Project Site Transfer' : 'Section Trade Shift'}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* If Site to Site Transfer: Allow choosing Target Site */}
              {transferMode === 'site' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Target Project Site:
                  </label>
                  <select
                    value={toSiteId}
                    onChange={(e) => handleDestSiteChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                  >
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.code}) &bull; {site.location}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* If Section to Section Transfer: Keep site fixed & display notice */
                <div className="p-2 bg-white border border-purple-200/70 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-purple-900 font-bold">
                    <Building2 className="h-3.5 w-3.5 text-purple-600" />
                    <span>Current Project Site: {sourceSite?.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    Internal Site
                  </span>
                </div>
              )}

              {/* Target Trade Section */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  {transferMode === 'site' ? 'Target Trade Section at New Site:' : 'New Target Trade Section:'}
                </label>
                <select
                  value={toSectionId}
                  onChange={(e) => setToSectionId(e.target.value)}
                  required
                  className={`w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:outline-none cursor-pointer border ${
                    transferMode === 'site'
                      ? 'border-indigo-200 focus:ring-indigo-600'
                      : 'border-purple-200 focus:ring-purple-600'
                  }`}
                >
                  {destinationSections.length === 0 ? (
                    <option value="">No trade sections available</option>
                  ) : (
                    destinationSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.code}) &bull; In-Charge: {sec.inCharge}
                        {sec.id === activeWorker?.currentSectionId ? ' (Current Section)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Settings: Scope, Date, Approver */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Transfer Scope */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Transfer Scope / Nature:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMigrationType('temporary')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  migrationType === 'temporary'
                    ? 'bg-blue-50/90 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">Temporary Shift</span>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  Temporary dispatch; keeps origin home roster
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMigrationType('permanent')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  migrationType === 'permanent'
                    ? 'bg-purple-50/90 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">Permanent Transfer</span>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  Full muster relocation to target unit
                </span>
              </button>
            </div>
          </div>

          {/* Effective Date & Approver */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Effective Transfer Date:
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Authorized By:</label>
              <div className="relative">
                <ShieldCheck className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Supervisor / Administrator Name"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Reason Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-700">
            Primary Transfer Reason:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(transferMode === 'site'
              ? [
                  'Site Workload Balancing',
                  'Specialized Skilled Workforce Support',
                  'Project Emergency / Concrete Pour',
                  'Target Site Manpower Shortage',
                  'Excavation & Shuttering Rush',
                  'Worker Request / Relocation',
                ]
              : [
                  'Trade Craft Reassignment',
                  'Section Workload Surge',
                  'Multi-Skilled Trade Deployment',
                  'Craft Upgrade / Promotion',
                  'Section In-Charge Request',
                  'Worker Trade Request',
                ]
            ).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setReason(tag);
                  setCustomReason('');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  reason === tag && !customReason
                    ? transferMode === 'site'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Or type custom transfer reason..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        {/* Operational Remarks */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Operational Remarks &amp; Duty Notes:
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Report to site trade supervisor at 8:00 AM. Travel allowance / gear issued."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
          />
        </div>

        {/* Live Preview Confirmation Callout */}
        {activeWorker && destSecObj && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs ${
              transferMode === 'site'
                ? 'bg-indigo-50 border-indigo-200/80 text-indigo-950'
                : 'bg-purple-50 border-purple-200/80 text-purple-950'
            }`}
          >
            <CheckCircle2
              className={`h-4 w-4 flex-shrink-0 ${transferMode === 'site' ? 'text-indigo-600' : 'text-purple-600'}`}
            />
            {transferMode === 'site' ? (
              <span>
                Transferring <strong>{activeWorker.name}</strong> ({activeWorker.id}) from{' '}
                <strong>{sourceSite?.name || activeWorker.currentSiteId}</strong> ({sourceSection?.name || 'Section'}) to{' '}
                <strong>{destSiteObj?.name || toSiteId}</strong> ({destSecObj.name}) as{' '}
                <strong className="uppercase">{migrationType}</strong> site transfer.
              </span>
            ) : (
              <span>
                Transferring <strong>{activeWorker.name}</strong> ({activeWorker.id}) from Section{' '}
                <strong>{sourceSection?.name || 'Current'}</strong> &rarr; Section <strong>{destSecObj.name}</strong> at{' '}
                <strong>{sourceSite?.name || 'Project Site'}</strong> as{' '}
                <strong className="uppercase">{migrationType}</strong> trade transfer.
              </span>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-5 py-2 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
              transferMode === 'site'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>
              {transferMode === 'site' ? 'Confirm & Execute Site Transfer' : 'Confirm & Execute Section Transfer'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomSiteMigrationModal;
