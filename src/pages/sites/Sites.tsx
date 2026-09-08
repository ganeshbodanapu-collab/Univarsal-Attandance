import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Site, Section, Worker } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { Toast } from '../../components/common/Toast';
import { WorkerAttendanceModal } from '../../components/attendance/WorkerAttendanceModal';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { EditEmployeeModal } from '../../components/sections/EditEmployeeModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Building2,
  MapPin,
  Users,
  Layers,
  CalendarCheck,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Edit3,
  Trash2,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  ChevronRight,
  Search,
  Calendar,
  DollarSign,
  Phone,
  LayoutGrid,
  List,
} from 'lucide-react';
export { SiteDetails } from './SiteDetails';

export const Sites: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    sites,
    sections,
    workers,
    attendance,
    currentUser,
    addSite,
    updateSite,
    deleteSite,
    addSection,
    updateSection,
    deleteSection,
    deleteWorker,
  } = useAttendanceContext();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // URL state for 3-step hierarchical drill-down
  const activeSiteId = searchParams.get('siteId');
  const activeSectionId = searchParams.get('sectionId');

  // Resolved Site & Section
  const selectedSite = useMemo(() => {
    if (!activeSiteId) return null;
    const clean = activeSiteId.toLowerCase();
    return sites.find((s) => s.id.toLowerCase() === clean || s.code.toLowerCase() === clean) || null;
  }, [sites, activeSiteId]);

  const selectedSection = useMemo(() => {
    if (!selectedSite || !activeSectionId) return null;
    const clean = activeSectionId.toLowerCase();
    return (
      sections.find(
        (sec) =>
          sec.siteId === selectedSite.id &&
          (sec.id.toLowerCase() === clean || sec.code.toLowerCase() === clean)
      ) || null
    );
  }, [sections, selectedSite, activeSectionId]);

  // View switchers & filters for Step 1 (Sites)
  const [siteViewMode, setSiteViewMode] = useState<'cards' | 'table'>('cards');
  const [siteSearch, setSiteSearch] = useState('');
  const [siteStatusFilter, setSiteStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filters for Step 2 (Sections)
  const [sectionSearch, setSectionSearch] = useState('');

  // Filters for Step 3 (Employees & Attendance)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState<'all' | 'present' | 'halfDay' | 'absent' | 'unmarked'>('all');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'all' | 'company' | 'outside'>('all');

  // Modals state
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);

  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [selectedWorkerForAttendance, setSelectedWorkerForAttendance] = useState<Worker | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // Form states - Add Site
  const [newSiteCode, setNewSiteCode] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteInCharge, setNewSiteInCharge] = useState('');
  const [newSiteMobile, setNewSiteMobile] = useState('');
  const [newSiteStatus, setNewSiteStatus] = useState<'active' | 'inactive'>('active');
  const [newSiteRemarks, setNewSiteRemarks] = useState('');

  // Form states - Edit Site
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteLocation, setEditSiteLocation] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteInCharge, setEditSiteInCharge] = useState('');
  const [editSiteMobile, setEditSiteMobile] = useState('');
  const [editSiteStatus, setEditSiteStatus] = useState<'active' | 'inactive'>('active');
  const [editSiteRemarks, setEditSiteRemarks] = useState('');

  // Form states - Add Section
  const [newSecCode, setNewSecCode] = useState('');
  const [newSecName, setNewSecName] = useState('');
  const [newSecInCharge, setNewSecInCharge] = useState('');
  const [newSecMobile, setNewSecMobile] = useState('');
  const [newSecRemarks, setNewSecRemarks] = useState('');

  // Form states - Edit Section
  const [editSecName, setEditSecName] = useState('');
  const [editSecInCharge, setEditSecInCharge] = useState('');
  const [editSecMobile, setEditSecMobile] = useState('');
  const [editSecStatus, setEditSecStatus] = useState<'active' | 'inactive'>('active');
  const [editSecRemarks, setEditSecRemarks] = useState('');

  // Employee Editing & Deletion states
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);

  // Deletion Dialog States
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const handleConfirmDeleteSite = () => {
    if (!siteToDelete) return;
    const sName = siteToDelete.name;
    const sId = siteToDelete.id;
    deleteSite(sId);
    if (selectedSite?.id === sId) {
      setSearchParams({});
    }
    setToastMessage(`Project site "${sName}" and all associated sections/workers deleted.`);
    setSiteToDelete(null);
    setShowEditSiteModal(false);
  };

  const handleConfirmDeleteSection = () => {
    if (!sectionToDelete) return;
    const secName = sectionToDelete.name;
    const secId = sectionToDelete.id;
    deleteSection(secId);
    if (selectedSection?.id === secId) {
      if (selectedSite) {
        setSearchParams({ siteId: selectedSite.id });
      } else {
        setSearchParams({});
      }
    }
    setToastMessage(`Work section "${secName}" deleted successfully.`);
    setSectionToDelete(null);
    setShowEditSectionModal(false);
  };

  const handleConfirmDeleteWorker = () => {
    if (!workerToDelete) return;
    const wName = workerToDelete.name;
    deleteWorker(workerToDelete.id);
    setToastMessage(`Employee "${wName}" deleted permanently.`);
    setWorkerToDelete(null);
    setShowEditWorkerModal(false);
  };

  // Step Navigation Handlers
  const handleSelectSite = (siteId: string) => {
    setSearchParams({ siteId });
  };

  const handleSelectSection = (sectionId: string) => {
    if (!selectedSite) return;
    setSearchParams({ siteId: selectedSite.id, sectionId });
  };

  const handleBackToSites = () => {
    setSearchParams({});
  };

  const handleBackToSections = () => {
    if (selectedSite) {
      setSearchParams({ siteId: selectedSite.id });
    } else {
      setSearchParams({});
    }
  };

  // Site Creation & Editing
  const handleSaveNewSite = () => {
    if (!newSiteName.trim() || !newSiteLocation.trim() || !newSiteInCharge.trim() || !newSiteMobile.trim()) {
      alert('Please fill in all required fields.');
      return;
    }
    const generatedCode = newSiteCode.trim() || `S${String(sites.length + 1).padStart(3, '0')}`;
    addSite({
      code: generatedCode,
      name: newSiteName.trim(),
      location: newSiteLocation.trim(),
      address: newSiteAddress.trim() || undefined,
      inCharge: newSiteInCharge.trim(),
      mobile: newSiteMobile.trim(),
      status: newSiteStatus,
      createdDate: new Date().toISOString().split('T')[0],
      remarks: newSiteRemarks.trim() || undefined,
    });
    setToastMessage(`Project Site "${newSiteName}" registered successfully.`);
    setShowAddSiteModal(false);
    setNewSiteCode('');
    setNewSiteName('');
    setNewSiteLocation('');
    setNewSiteAddress('');
    setNewSiteInCharge('');
    setNewSiteMobile('');
    setNewSiteStatus('active');
    setNewSiteRemarks('');
  };

  const handleOpenEditSite = (site: Site, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSite(site);
    setEditSiteName(site.name);
    setEditSiteLocation(site.location);
    setEditSiteAddress(site.address || '');
    setEditSiteInCharge(site.inCharge);
    setEditSiteMobile(site.mobile);
    setEditSiteStatus(site.status);
    setEditSiteRemarks(site.remarks || '');
    setShowEditSiteModal(true);
  };

  const handleSaveEditSite = () => {
    if (!editingSite) return;
    updateSite({
      ...editingSite,
      name: editSiteName.trim(),
      location: editSiteLocation.trim(),
      address: editSiteAddress.trim() || undefined,
      inCharge: editSiteInCharge.trim(),
      mobile: editSiteMobile.trim(),
      status: editSiteStatus,
      remarks: editSiteRemarks.trim() || undefined,
    });
    setToastMessage(`Site "${editSiteName}" updated successfully.`);
    setShowEditSiteModal(false);
    setEditingSite(null);
  };

  // Section Creation & Editing
  const handleSaveNewSection = () => {
    if (!selectedSite) return;
    if (!newSecName.trim() || !newSecInCharge.trim() || !newSecMobile.trim()) {
      alert('Please fill in section name, in-charge, and mobile.');
      return;
    }
    const siteSecs = sections.filter((s) => s.siteId === selectedSite.id);
    const generatedCode = newSecCode.trim() || `SEC-${String(siteSecs.length + 1).padStart(3, '0')}`;
    addSection({
      code: generatedCode,
      name: newSecName.trim(),
      siteId: selectedSite.id,
      inCharge: newSecInCharge.trim(),
      mobile: newSecMobile.trim(),
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
      remarks: newSecRemarks.trim() || undefined,
    });
    setToastMessage(`Section "${newSecName}" created under ${selectedSite.name}.`);
    setShowAddSectionModal(false);
    setNewSecCode('');
    setNewSecName('');
    setNewSecInCharge('');
    setNewSecMobile('');
    setNewSecRemarks('');
  };

  const handleOpenEditSection = (sec: Section, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSection(sec);
    setEditSecName(sec.name);
    setEditSecInCharge(sec.inCharge);
    setEditSecMobile(sec.mobile);
    setEditSecStatus(sec.status);
    setEditSecRemarks(sec.remarks || '');
    setShowEditSectionModal(true);
  };

  const handleSaveEditSection = () => {
    if (!editingSection) return;
    updateSection({
      ...editingSection,
      name: editSecName.trim(),
      inCharge: editSecInCharge.trim(),
      mobile: editSecMobile.trim(),
      status: editSecStatus,
      remarks: editSecRemarks.trim() || undefined,
    });
    setToastMessage(`Section "${editSecName}" updated successfully.`);
    setShowEditSectionModal(false);
    setEditingSection(null);
  };

  // ==========================================
  // DATA COMPUTATIONS FOR STEP 1 (ALL SITES)
  // ==========================================
  const displaySites = useMemo(() => {
    let list = currentUser?.role === 'supervisor'
      ? sites.filter((s) => s.id === currentUser?.assignedSiteId)
      : sites;

    if (siteStatusFilter !== 'all') {
      list = list.filter((s) => s.status === siteStatusFilter);
    }

    if (siteSearch.trim()) {
      const q = siteSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.inCharge.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sites, currentUser, siteStatusFilter, siteSearch]);

  const todayStr = new Date().toISOString().split('T')[0];
  const totalSitesCount = sites.length;
  const totalSectionsCount = sections.length;
  const totalActiveWorkersCount = workers.filter((w) => w.status === 'active').length;
  const totalPresentTodayCount = attendance.filter((a) => a.date === todayStr && a.status === 'present').length;

  const siteColumns: Column<Site>[] = [
    {
      header: 'S.No',
      render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span>,
    },
    {
      header: 'Site Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Site Name',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => handleSelectSite(row.id)}
          className="font-bold text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors text-left flex items-center space-x-1 cursor-pointer"
        >
          <span>{row.name}</span>
          <ArrowRight className="h-3 w-3 text-blue-500" />
        </button>
      ),
    },
    {
      header: 'Location',
      accessor: 'location',
      render: (row) => <span className="text-xs text-slate-600">{row.location}</span>,
    },
    {
      header: 'Manager In Charge',
      accessor: 'inCharge',
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 block">{row.inCharge}</span>
          <span className="text-[11px] text-slate-400">{row.mobile}</span>
        </div>
      ),
    },
    {
      header: 'Sections',
      render: (row) => {
        const secCount = sections.filter((s) => s.siteId === row.id).length;
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>{secCount} Sections</span>
          </span>
        );
      },
    },
    {
      header: 'Workforce',
      render: (row) => {
        const count = workers.filter((w) => w.currentSiteId === row.id && w.status === 'active').length;
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span>{count} Workers</span>
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Action',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => handleSelectSite(row.id)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            title="Open Site Sections"
          >
            <span>Open Sections</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <Link
            to={`/sites/${row.id}`}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="View Full Site 360"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {currentUser?.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={(e) => handleOpenEditSite(row, e)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Edit Site Details"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSiteToDelete(row);
                }}
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                title="Delete Project Site"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ==========================================
  // DATA COMPUTATIONS FOR STEP 2 (SITE SECTIONS)
  // ==========================================
  const currentSiteSections = useMemo(() => {
    if (!selectedSite) return [];
    let list = sections.filter((s) => s.siteId === selectedSite.id);
    if (sectionSearch.trim()) {
      const q = sectionSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.inCharge.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sections, selectedSite, sectionSearch]);

  // ==========================================
  // DATA COMPUTATIONS FOR STEP 3 (EMPLOYEES & ATTENDANCE)
  // ==========================================
  const currentSectionWorkers = useMemo(() => {
    if (!selectedSection) return [];
    let list = workers.filter((w) => w.currentSectionId === selectedSection.id);

    if (workerTypeFilter !== 'all') {
      list = list.filter((w) => w.workerType === workerTypeFilter);
    }

    if (workerSearch.trim()) {
      const q = workerSearch.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.mobile.toLowerCase().includes(q) ||
          `${selectedSite?.code || ''}-${w.id}`.toLowerCase().includes(q)
      );
    }

    if (workerStatusFilter !== 'all') {
      list = list.filter((w) => {
        const attRecord = attendance.find((a) => a.workerId === w.id && a.date === attendanceDate);
        if (workerStatusFilter === 'unmarked') {
          return !attRecord;
        }
        return attRecord?.status === workerStatusFilter;
      });
    }

    return list;
  }, [workers, selectedSection, workerTypeFilter, workerSearch, workerStatusFilter, attendance, attendanceDate, selectedSite]);

  const sectionAllWorkers = useMemo(() => {
    if (!selectedSection) return [];
    return workers.filter((w) => w.currentSectionId === selectedSection.id);
  }, [workers, selectedSection]);

  const sectionAttendanceRecords = useMemo(() => {
    if (!selectedSection) return [];
    const workerIdSet = new Set(sectionAllWorkers.map((w) => w.id));
    return attendance.filter((a) => workerIdSet.has(a.workerId) && a.date === attendanceDate);
  }, [attendance, sectionAllWorkers, attendanceDate]);

  const secPresentCount = sectionAttendanceRecords.filter((a) => a.status === 'present').length;
  const secHalfDayCount = sectionAttendanceRecords.filter((a) => a.status === 'halfDay').length;
  const secAbsentCount = sectionAttendanceRecords.filter((a) => a.status === 'absent').length;
  const secUnmarkedCount = sectionAllWorkers.length - sectionAttendanceRecords.length;
  const secTotalDailyWage = sectionAllWorkers.reduce((sum, w) => sum + w.dailyWage, 0);

  return (
    <div className="space-y-6">
      {/* 3-STEP HIERARCHICAL PROGRESS INDICATOR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
          {/* Step 1: Sites */}
          <button
            type="button"
            onClick={handleBackToSites}
            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              !selectedSite
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
            }`}
          >
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                !selectedSite ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
              }`}
            >
              1
            </div>
            <div className="text-left">
              <span className="block leading-tight">Step 1: Sites</span>
              <span className="text-[10px] opacity-80 block font-medium">
                {selectedSite ? selectedSite.name : 'Multiple Sites'}
              </span>
            </div>
          </button>

          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />

          {/* Step 2: Sections */}
          <button
            type="button"
            onClick={handleBackToSections}
            disabled={!selectedSite}
            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSite && !selectedSection
                ? 'bg-blue-600 text-white shadow-xs cursor-pointer'
                : selectedSite
                ? 'text-slate-600 hover:bg-slate-100 hover:text-blue-600 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                selectedSite && !selectedSection
                  ? 'bg-white text-blue-600'
                  : selectedSite
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </div>
            <div className="text-left">
              <span className="block leading-tight">Step 2: Sections</span>
              <span className="text-[10px] opacity-80 block font-medium">
                {selectedSection ? selectedSection.name : selectedSite ? `${currentSiteSections.length} Sections` : 'Select a site first'}
              </span>
            </div>
          </button>

          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />

          {/* Step 3: Employees & Attendance */}
          <div
            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 ${
              selectedSection
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 opacity-60'
            }`}
          >
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                selectedSection ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <div className="text-left">
              <span className="block leading-tight">Step 3: Employees & Attendance</span>
              <span className="text-[10px] opacity-80 block font-medium">
                {selectedSection ? `${sectionAllWorkers.length} Employees` : 'Select a section first'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: MULTIPLE SITES DIRECTORY */}
      {/* ========================================================================= */}
      {!selectedSite && (
        <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                  Step 1 • Workforce & Field
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Project Sites Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Select any project site below to open and inspect its operational trade sections and supervisors.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-center">
              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSiteViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    siteViewMode === 'cards'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSiteViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    siteViewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Data Table View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Site</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Project Sites"
              value={totalSitesCount}
              icon={<Building2 className="h-5 w-5 text-blue-600" />}
              description="Active project locations"
            />
            <StatCard
              title="Trade Sections"
              value={totalSectionsCount}
              icon={<Layers className="h-5 w-5 text-indigo-600" />}
              description="Operational work units"
            />
            <StatCard
              title="Active Workforce"
              value={totalActiveWorkersCount}
              icon={<Users className="h-5 w-5 text-emerald-600" />}
              description="Deployed personnel"
            />
            <StatCard
              title="Present Today"
              value={totalPresentTodayCount}
              icon={<CalendarCheck className="h-5 w-5 text-teal-600" />}
              description="Checked in across all sites"
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Search sites by code, name, location, or manager..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={siteStatusFilter}
                onChange={(e) => setSiteStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Cards Grid View */}
          {siteViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {displaySites.map((site) => {
                const siteSecs = sections.filter((s) => s.siteId === site.id);
                const siteWorkers = workers.filter((w) => w.currentSiteId === site.id && w.status === 'active');
                const siteWorkerIds = new Set(siteWorkers.map((w) => w.id));
                const presentToday = attendance.filter(
                  (a) => a.date === todayStr && siteWorkerIds.has(a.workerId) && a.status === 'present'
                ).length;

                return (
                  <div
                    key={site.id}
                    onClick={() => handleSelectSite(site.id)}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-blue-400/80 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Top Code & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                          {site.code}
                        </span>
                        <StatusBadge status={site.status} />
                      </div>

                      {/* Site Name & Location */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                          {site.name}
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{site.location}</span>
                        </div>
                      </div>

                      {/* In-Charge Manager */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Manager In-Charge
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{site.inCharge}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{site.mobile}</span>
                        </div>
                      </div>

                      {/* Metrics Pills */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase block">Sections</span>
                          <span className="text-sm font-black text-indigo-900">{siteSecs.length}</span>
                        </div>
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-blue-600 uppercase block">Workers</span>
                          <span className="text-sm font-black text-blue-900">{siteWorkers.length}</span>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2 text-center">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
                          <span className="text-sm font-black text-emerald-900">{presentToday}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSite(site.id);
                        }}
                        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                      >
                        <span>Select Site → View Sections</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      {currentUser?.role === 'admin' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditSite(site, e)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Edit Site Details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSiteToDelete(site);
                            }}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Project Site"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <DataTable
              columns={siteColumns}
              data={displaySites}
              emptyTitle="No project sites configured"
              emptyDescription="Please initialize project sites."
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: SITE SECTIONS EXPLORER */}
      {/* ========================================================================= */}
      {selectedSite && !selectedSection && (
        <div className="space-y-6">
          {/* Breadcrumb Header */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={handleBackToSites}
              className="hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Sites</span>
            </button>
            <span>/</span>
            <span className="text-slate-900 font-bold">
              {selectedSite.name} ({selectedSite.code})
            </span>
            <span>/</span>
            <span className="text-blue-600 font-bold">Sections</span>
          </div>

          {/* Selected Site Context Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center space-x-5">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-inner shrink-0">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Site Code: {selectedSite.code}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {selectedSite.name}
                    </h1>
                    <StatusBadge status={selectedSite.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 font-medium">
                    <span className="inline-flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-400" />
                      <span>{selectedSite.location}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span>Manager: <strong>{selectedSite.inCharge}</strong></span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <Phone className="h-3.5 w-3.5 text-blue-400" />
                      <span>{selectedSite.mobile}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
                <button
                  type="button"
                  onClick={handleBackToSites}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>← Change Site</span>
                </button>

                {currentUser?.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddSectionModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Add Section</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEmployeeModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>+ Add Employee</span>
                    </button>
                  </>
                )}

                <Link
                  to={`/sites/${selectedSite.id}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Site 360</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Section Directory Subtitle & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  Step 2 • Select Work Section
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {currentSiteSections.length} Sections in {selectedSite.name}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                Operational Work Sections
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Click any section below to open employee names, wage rates, and live daily attendance.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                placeholder="Search section name or supervisor..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium bg-white"
              />
            </div>
          </div>

          {/* Sections Cards Grid */}
          {currentSiteSections.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Sections Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No work sections match your query or have been configured for {selectedSite.name}.
              </p>
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  + Add First Section
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {currentSiteSections.map((sec) => {
                const secWorkers = workers.filter((w) => w.currentSectionId === sec.id);
                const secWorkerIds = new Set(secWorkers.map((w) => w.id));
                const presentCount = attendance.filter(
                  (a) => a.date === todayStr && secWorkerIds.has(a.workerId) && a.status === 'present'
                ).length;
                const halfDayCount = attendance.filter(
                  (a) => a.date === todayStr && secWorkerIds.has(a.workerId) && a.status === 'halfDay'
                ).length;
                const absentCount = attendance.filter(
                  (a) => a.date === todayStr && secWorkerIds.has(a.workerId) && a.status === 'absent'
                ).length;

                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSelectSection(sec.id)}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-indigo-400/80 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Section Code & Status */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                          {sec.code}
                        </span>
                        <StatusBadge status={sec.status} />
                      </div>

                      {/* Section Name */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                          {sec.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Parent: {selectedSite.name}</p>
                      </div>

                      {/* Supervisor In Charge */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Supervisor In-Charge
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{sec.inCharge}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{sec.mobile}</span>
                        </div>
                      </div>

                      {/* Attendance & Workers Metrics */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2">
                          <span className="text-[9px] font-bold text-blue-600 uppercase block">Workers</span>
                          <span className="text-xs font-black text-blue-900">{secWorkers.length}</span>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2">
                          <span className="text-[9px] font-bold text-emerald-600 uppercase block">Present</span>
                          <span className="text-xs font-black text-emerald-900">{presentCount}</span>
                        </div>
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2">
                          <span className="text-[9px] font-bold text-amber-600 uppercase block">Half Day</span>
                          <span className="text-xs font-black text-amber-900">{halfDayCount}</span>
                        </div>
                        <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2">
                          <span className="text-[9px] font-bold text-rose-600 uppercase block">Absent</span>
                          <span className="text-xs font-black text-rose-900">{absentCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSection(sec.id);
                        }}
                        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                      >
                        <span>Select Section → View Employees & Attendance</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      {currentUser?.role === 'admin' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditSection(sec, e)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Edit Section Details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectionToDelete(sec);
                            }}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title="Delete Work Section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 3: SECTION EMPLOYEES & ATTENDANCE CONSOLE */}
      {/* ========================================================================= */}
      {selectedSite && selectedSection && (
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={handleBackToSites}
              className="hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
            >
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>All Sites</span>
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={handleBackToSections}
              className="hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
            >
              <span>{selectedSite.name}</span>
            </button>
            <span>/</span>
            <span className="text-slate-900 font-black">
              {selectedSection.name} ({selectedSection.code})
            </span>
          </div>

          {/* Section Hero Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center space-x-5">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shadow-indigo-500/20 shrink-0">
                  <Layers className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedSection.code}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {selectedSection.name}
                    </h1>
                    <StatusBadge status={selectedSection.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 font-medium">
                    <span className="inline-flex items-center space-x-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Parent Site: <strong>{selectedSite.name} ({selectedSite.code})</strong>
                      </span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Supervisor: <strong>{selectedSection.inCharge}</strong>
                      </span>
                    </span>
                    <span className="inline-flex items-center space-x-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedSection.mobile}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Section Switcher */}
              <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
                <button
                  type="button"
                  onClick={handleBackToSections}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>← Back to Sections</span>
                </button>

                {/* Quick Section Switcher dropdown */}
                <select
                  value={selectedSection.id}
                  onChange={(e) => handleSelectSection(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  title="Switch Section within this site"
                >
                  {sections
                    .filter((s) => s.siteId === selectedSite.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Switch to: {s.name} ({s.code})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Add New Employee</span>
                </button>

                {currentUser?.role === 'admin' && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditSection(selectedSection, e)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Edit Section Details"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSectionToDelete(selectedSection);
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                      title="Delete This Section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
            <StatCard
              title="Deployed Workers"
              value={sectionAllWorkers.length}
              icon={<Users className="h-5 w-5 text-blue-600" />}
              description="Assigned to section"
            />
            <StatCard
              title="Present"
              value={secPresentCount}
              icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
              description="Full day duty"
            />
            <StatCard
              title="Half Day"
              value={secHalfDayCount}
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              description="0.5 day duty"
            />
            <StatCard
              title="Absent"
              value={secAbsentCount}
              icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
              description="Off duty today"
            />
            <StatCard
              title="Not Marked"
              value={secUnmarkedCount}
              icon={<Clock className="h-5 w-5 text-slate-400" />}
              description="Pending check-in"
            />
            <StatCard
              title="Daily Wage Rate"
              value={`₹${secTotalDailyWage.toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5 text-teal-600" />}
              description="Section daily wage sum"
            />
          </div>

          {/* Interactive Attendance Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Employees Roster & Daily Attendance Log
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Inspect employee names, IDs, serials, and record or update their daily attendance.
                </p>
              </div>

              {/* Date Selector & Quick Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                  <span>Attendance Date:</span>
                </span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:outline-hidden focus:border-blue-500 text-slate-800 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    attendanceDate === new Date().toISOString().split('T')[0]
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setAttendanceDate(y.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              {/* Search Employee */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  placeholder="Search by name, ID, serial or phone..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={workerStatusFilter}
                  onChange={(e) => setWorkerStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="all">All Attendance Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="halfDay">Half Day Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="unmarked">Not Marked Only</option>
                </select>
              </div>

              {/* Worker Type Filter */}
              <div>
                <select
                  value={workerTypeFilter}
                  onChange={(e) => setWorkerTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="all">All Worker Types</option>
                  <option value="company">Company Employees</option>
                  <option value="outside">Contractor / Outside</option>
                </select>
              </div>
            </div>

            {/* Comprehensive Employees & Attendance Table */}
            <DataTable
              data={currentSectionWorkers}
              emptyTitle="No employees found"
              emptyDescription={`No employees match the filters for section "${selectedSection.name}". Click "+ Add New Employee" to register workers.`}
              columns={[
                {
                  header: 'S.No',
                  render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span>,
                },
                {
                  header: 'Serial No',
                  render: (row) => (
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {row.serialNumber || (row.id.startsWith('W') ? `${selectedSite.code}-${row.id}` : row.id)}
                    </span>
                  ),
                },
                {
                  header: 'Employee ID',
                  accessor: 'id',
                  render: (row) => (
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {row.id}
                    </span>
                  ),
                },
                {
                  header: 'Employee Name & Mobile',
                  accessor: 'name',
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        {row.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedWorkerForAttendance(row)}
                          className="font-bold text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors text-left flex items-center space-x-1 cursor-pointer"
                          title="Click to check in or modify attendance"
                        >
                          <span>{row.name}</span>
                        </button>
                        <span className="block text-[11px] text-slate-500">{row.mobile}</span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Type',
                  accessor: 'workerType',
                  render: (row) => (
                    <span
                      className={`capitalize text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        row.workerType === 'company'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {row.workerType}
                    </span>
                  ),
                },
                {
                  header: 'Daily Wage',
                  render: (row) => (
                    <span className="font-bold text-xs text-slate-900">₹{row.dailyWage}</span>
                  ),
                },
                {
                  header: `Attendance (${attendanceDate})`,
                  render: (row) => {
                    const rec = attendance.find((a) => a.workerId === row.id && a.date === attendanceDate);

                    if (!rec) {
                      return (
                        <button
                          type="button"
                          onClick={() => setSelectedWorkerForAttendance(row)}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-all inline-flex items-center space-x-1 cursor-pointer"
                          title="Not recorded yet. Click to record attendance."
                        >
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>Not Marked • Click Here</span>
                        </button>
                      );
                    }

                    const methodBadge = {
                      face: { label: 'Face ID', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
                      fingerprint: { label: 'Fingerprint', color: 'text-purple-700 bg-purple-50 border-purple-200' },
                      manual: { label: 'Manual', color: 'text-slate-700 bg-slate-100 border-slate-200' },
                    }[rec.method] || { label: rec.method, color: 'text-slate-700 bg-slate-100 border-slate-200' };

                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={rec.status} />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${methodBadge.color}`}>
                          {methodBadge.label}
                        </span>
                        {rec.checkIn && (
                          <span className="text-[11px] text-slate-600 font-semibold">
                            {rec.checkIn}
                            {rec.checkOut ? ` - ${rec.checkOut}` : ''}
                          </span>
                        )}
                        {rec.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoModal(rec.photoUrl || null)}
                            className="h-6 w-6 rounded-md overflow-hidden border border-slate-300 hover:border-blue-500 shadow-2xs shrink-0 cursor-pointer"
                            title="View Attendance Photo Proof"
                          >
                            <img src={rec.photoUrl} alt="Proof" className="h-full w-full object-cover" />
                          </button>
                        )}
                      </div>
                    );
                  },
                },
                {
                  header: 'Actions',
                  render: (row) => (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerForAttendance(row)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                        title="Record Face ID, Fingerprint, or Manual Attendance"
                      >
                        <CalendarCheck className="h-3.5 w-3.5" />
                        <span>Check In</span>
                      </button>
                      <Link
                        to={`/workers/${row.id}`}
                        className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center justify-center"
                        title="View Worker 360 Profile"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWorker(row);
                              setShowEditWorkerModal(true);
                            }}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Edit Employee Name & Details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setWorkerToDelete(row)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Delete Employee Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* WORKER ATTENDANCE MODAL (Face, Fingerprint, Manual) */}
      {selectedWorkerForAttendance && (
        <WorkerAttendanceModal
          isOpen={!!selectedWorkerForAttendance}
          onClose={() => setSelectedWorkerForAttendance(null)}
          worker={selectedWorkerForAttendance}
          section={selectedSection}
          site={selectedSite}
          onSuccess={(wName, msg) => {
            setToastMessage(`Attendance for ${wName} recorded successfully: ${msg}`);
            setSelectedWorkerForAttendance(null);
          }}
        />
      )}

      {/* NEW EMPLOYEE JOINING MODAL */}
      {showAddEmployeeModal && (
        <NewEmployeeJoiningModal
          isOpen={showAddEmployeeModal}
          onClose={() => setShowAddEmployeeModal(false)}
          site={selectedSite || undefined}
          section={selectedSection || undefined}
          initialSiteId={selectedSite?.id}
          initialSectionId={selectedSection?.id}
          onSuccess={(worker) => {
            setToastMessage(`Employee "${worker.name}" registered successfully!`);
            setShowAddEmployeeModal(false);
          }}
        />
      )}

      {/* PHOTO PROOF PREVIEW MODAL */}
      {previewPhotoModal && (
        <Modal
          isOpen={!!previewPhotoModal}
          onClose={() => setPreviewPhotoModal(null)}
          title="Attendance Verification Photo Proof"
          subtitle="Biometric / Geo-tagged Camera Verification"
          size="md"
        >
          <div className="space-y-4 text-center">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center max-h-96">
              <img src={previewPhotoModal} alt="Biometric Proof" className="max-h-96 w-auto object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE SITE MODAL */}
      <Modal
        isOpen={showAddSiteModal}
        onClose={() => setShowAddSiteModal(false)}
        title="Create Project Site"
        subtitle="Establish a new physical job site with in-charge manager and contact details."
        icon={<Building2 className="h-5 w-5" />}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Site Code"
              placeholder="e.g. S006 (or auto-assigned)"
              value={newSiteCode}
              onChange={(e) => setNewSiteCode(e.target.value)}
            />
            <Input
              label="Site Name *"
              placeholder="e.g. Downtown Plaza Tower 3"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location Area *"
              placeholder="e.g. Sector 42 West"
              value={newSiteLocation}
              onChange={(e) => setNewSiteLocation(e.target.value)}
            />
            <Input
              label="Physical Address"
              placeholder="Plot / street address..."
              value={newSiteAddress}
              onChange={(e) => setNewSiteAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Manager In Charge *"
              placeholder="e.g. Amit Kumar"
              value={newSiteInCharge}
              onChange={(e) => setNewSiteInCharge(e.target.value)}
            />
            <Input
              label="Mobile Number *"
              placeholder="e.g. 9876543210"
              value={newSiteMobile}
              onChange={(e) => setNewSiteMobile(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={newSiteStatus}
              onChange={(e) => setNewSiteStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Input
              label="Remarks / Scope"
              placeholder="Brief scope notes..."
              value={newSiteRemarks}
              onChange={(e) => setNewSiteRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddSiteModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewSite}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Save Project Site
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT SITE MODAL */}
      {editingSite && (
        <Modal
          isOpen={showEditSiteModal}
          onClose={() => {
            setShowEditSiteModal(false);
            setEditingSite(null);
          }}
          title={`Edit Site: ${editingSite.name}`}
          subtitle={`Site Code: ${editingSite.code}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Site Name *"
                value={editSiteName}
                onChange={(e) => setEditSiteName(e.target.value)}
              />
              <Input
                label="Location Area *"
                value={editSiteLocation}
                onChange={(e) => setEditSiteLocation(e.target.value)}
              />
            </div>

            <Input
              label="Address"
              value={editSiteAddress}
              onChange={(e) => setEditSiteAddress(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Manager In Charge *"
                value={editSiteInCharge}
                onChange={(e) => setEditSiteInCharge(e.target.value)}
              />
              <Input
                label="Mobile Number *"
                value={editSiteMobile}
                onChange={(e) => setEditSiteMobile(e.target.value)}
              />
            </div>

            <Select
              label="Status"
              value={editSiteStatus}
              onChange={(e) => setEditSiteStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              {currentUser?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSiteToDelete(editingSite);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  <span>Delete Site</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSiteModal(false);
                    setEditingSite(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSite}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Update Site
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE SECTION MODAL */}
      <Modal
        isOpen={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        title={`Create Work Section in ${selectedSite?.name || 'Site'}`}
        subtitle="Add an operational trade section with dedicated supervisor in charge."
        icon={<Layers className="h-5 w-5" />}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Section Code"
            placeholder="e.g. SEC-005 (or auto-assigned)"
            value={newSecCode}
            onChange={(e) => setNewSecCode(e.target.value)}
          />
          <Input
            label="Section Name *"
            placeholder="e.g. Reinforced Concreting"
            value={newSecName}
            onChange={(e) => setNewSecName(e.target.value)}
          />
          <Input
            label="Supervisor In Charge *"
            placeholder="e.g. Ramesh Chandra"
            value={newSecInCharge}
            onChange={(e) => setNewSecInCharge(e.target.value)}
          />
          <Input
            label="Mobile Number *"
            placeholder="e.g. 9876543210"
            value={newSecMobile}
            onChange={(e) => setNewSecMobile(e.target.value)}
          />
          <Input
            label="Remarks / Scope"
            placeholder="Scope of work..."
            value={newSecRemarks}
            onChange={(e) => setNewSecRemarks(e.target.value)}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddSectionModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNewSection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Save Section
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT SECTION MODAL */}
      {editingSection && (
        <Modal
          isOpen={showEditSectionModal}
          onClose={() => {
            setShowEditSectionModal(false);
            setEditingSection(null);
          }}
          title={`Edit Section: ${editingSection.name}`}
          subtitle={`Section Code: ${editingSection.code}`}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Section Name *"
              value={editSecName}
              onChange={(e) => setEditSecName(e.target.value)}
            />
            <Input
              label="Supervisor In Charge *"
              value={editSecInCharge}
              onChange={(e) => setEditSecInCharge(e.target.value)}
            />
            <Input
              label="Mobile Number *"
              value={editSecMobile}
              onChange={(e) => setEditSecMobile(e.target.value)}
            />
            <Select
              label="Status"
              value={editSecStatus}
              onChange={(e) => setEditSecStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Input
              label="Remarks"
              value={editSecRemarks}
              onChange={(e) => setEditSecRemarks(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              {currentUser?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSectionToDelete(editingSection);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  <span>Delete Section</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSectionModal(false);
                    setEditingSection(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSection}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Update Section
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditWorkerModal && editingWorker && (
        <EditEmployeeModal
          isOpen={showEditWorkerModal}
          onClose={() => {
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
          worker={editingWorker}
          onSuccess={(w) => {
            setToastMessage(`Employee "${w.name}" updated successfully.`);
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
          onDeleted={() => {
            setToastMessage(`Employee record deleted.`);
            setShowEditWorkerModal(false);
            setEditingWorker(null);
          }}
        />
      )}

      {/* CONFIRM DELETE SITE DIALOG */}
      {siteToDelete && (
        <ConfirmDialog
          isOpen={!!siteToDelete}
          onClose={() => setSiteToDelete(null)}
          onConfirm={handleConfirmDeleteSite}
          title="Delete Project Site"
          message={`Are you sure you want to permanently delete project site "${siteToDelete.name}" (${siteToDelete.code})? All associated trade sections and deployed workforce will be permanently removed.`}
          confirmText="Delete Site Permanently"
          variant="danger"
        />
      )}

      {/* CONFIRM DELETE SECTION DIALOG */}
      {sectionToDelete && (
        <ConfirmDialog
          isOpen={!!sectionToDelete}
          onClose={() => setSectionToDelete(null)}
          onConfirm={handleConfirmDeleteSection}
          title="Delete Work Section"
          message={`Are you sure you want to delete trade section "${sectionToDelete.name}" (${sectionToDelete.code})? Associated worker assignments will also be removed.`}
          confirmText="Delete Section"
          variant="danger"
        />
      )}

      {/* CONFIRM DELETE WORKER DIALOG */}
      {workerToDelete && (
        <ConfirmDialog
          isOpen={!!workerToDelete}
          onClose={() => setWorkerToDelete(null)}
          onConfirm={handleConfirmDeleteWorker}
          title="Delete Employee Record"
          message={`Are you sure you want to permanently delete employee "${workerToDelete.name}" (${workerToDelete.id})? All associated attendance logs, advances, and ledger history will be permanently erased.`}
          confirmText="Delete Employee Permanently"
          variant="danger"
        />
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Sites;
