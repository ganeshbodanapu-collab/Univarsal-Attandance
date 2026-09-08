import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import type { Section } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Toast } from '../../components/common/Toast';
import { Plus, Layers, Edit3, Users, ArrowRight, UserPlus, Trash2 } from 'lucide-react';
import { NewEmployeeJoiningModal } from '../../components/sections/NewEmployeeJoiningModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
export { SectionDetails } from './SectionDetails';

export const Sections: React.FC = () => {
  const { sections, sites, workers, addSection, updateSection, deleteSection, currentUser } = useAttendanceContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  // Edit State
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Add Form State
  const [siteId, setSiteId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [inCharge, setInCharge] = useState('');
  const [mobile, setMobile] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [remarks, setRemarks] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editInCharge, setEditInCharge] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editRemarks, setEditRemarks] = useState('');

  const handleSave = () => {
    if (!siteId || !name.trim() || !inCharge.trim() || !mobile.trim()) {
      alert('Please fill in parent site, section name, in-charge, and mobile.');
      return;
    }

    const generatedCode = code.trim() || `SEC-${String(sections.length + 1).padStart(3, '0')}`;

    addSection({
      code: generatedCode,
      name: name.trim(),
      siteId,
      inCharge: inCharge.trim(),
      mobile: mobile.trim(),
      status,
      createdDate: new Date().toISOString().split('T')[0],
      remarks: remarks.trim() || undefined,
    });

    setToastMessage(`Section "${name}" created successfully.`);
    setShowAddModal(false);

    // Clear Form
    setSiteId('');
    setCode('');
    setName('');
    setInCharge('');
    setMobile('');
    setStatus('active');
    setRemarks('');
  };

  const handleOpenEdit = (sec: Section) => {
    setEditingSection(sec);
    setEditName(sec.name);
    setEditInCharge(sec.inCharge);
    setEditMobile(sec.mobile);
    setEditStatus(sec.status);
    setEditRemarks(sec.remarks || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingSection) return;
    updateSection({
      ...editingSection,
      name: editName.trim(),
      inCharge: editInCharge.trim(),
      mobile: editMobile.trim(),
      status: editStatus,
      remarks: editRemarks.trim() || undefined,
    });
    setToastMessage(`Section "${editName}" updated successfully.`);
    setShowEditModal(false);
    setEditingSection(null);
  };

  const columns: Column<Section>[] = [
    {
      header: 'S.No',
      render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span>,
    },
    {
      header: 'Section Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Section Name',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <Link
          to={`/sites?siteId=${row.siteId}&sectionId=${row.id}`}
          className="font-bold text-xs text-blue-700 hover:text-blue-900 transition-colors flex items-center space-x-1.5 group"
          title="Open Section Employees & Attendance"
        >
          <span>{row.name}</span>
          <ArrowRight className="h-3.5 w-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ),
    },
    {
      header: 'Parent Site',
      render: (row) => {
        const site = sites.find((s) => s.id === row.siteId);
        return (
          <Link to={`/sites?siteId=${site?.id || row.siteId}`} className="text-xs font-semibold text-slate-800 hover:text-blue-600">
            {site?.name || row.siteId}
          </Link>
        );
      },
    },
    {
      header: 'Supervisor In Charge',
      accessor: 'inCharge',
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 block">{row.inCharge}</span>
          <span className="text-[11px] text-slate-400">{row.mobile}</span>
        </div>
      ),
    },
    {
      header: 'Deployed Workers',
      render: (row) => {
        const count = workers.filter((w) => w.currentSectionId === row.id && w.status === 'active').length;
        return (
          <Link
            to={`/sites?siteId=${row.siteId}&sectionId=${row.id}`}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 rounded-lg transition-colors"
            title="View Section Employees & Attendance"
          >
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span>{count} Workers</span>
          </Link>
        );
      },
    },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/sites?siteId=${row.siteId}&sectionId=${row.id}`}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-all active:scale-95"
            title="Open Section Employees & Attendance"
          >
            <span>Employees & Attendance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => handleOpenEdit(row)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Edit Section"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSectionToDelete(row)}
                className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Delete Section"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const displaySections = currentUser?.role === 'supervisor'
    ? sections.filter((s) => s.siteId === currentUser?.assignedSiteId)
    : sections;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Work Sections Registry</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {currentUser?.role === 'supervisor'
              ? `Authorized Work Sections for Site ${currentUser?.assignedSiteId}.`
              : 'Work team sections, trade disciplines, and supervisor allocation per construction project.'}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add New Employee</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Work Section</span>
            </button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={displaySections}
        emptyTitle="No work sections found"
        emptyDescription="Please configure sections for your project sites."
      />

      {/* CREATE SECTION MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Work Section"
        subtitle="Organize labor by activity type, trade section, and supervisor assignment."
        icon={<Layers className="h-5 w-5" />}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Parent Project Site *"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={[
              { value: '', label: 'Select parent site...' },
              ...sites.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Section Code" placeholder="e.g. SEC-018 (or auto)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input label="Section Name *" placeholder="e.g. Concreting / HVAC" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Manager In Charge *" placeholder="e.g. Ketan Gupta" value={inCharge} onChange={(e) => setInCharge(e.target.value)} />
            <Input label="Mobile Number *" placeholder="e.g. 9988776655" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Input label="Remarks" placeholder="Optional notes..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Save Section
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT SECTION MODAL */}
      {editingSection && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingSection(null);
          }}
          title={`Edit Section: ${editingSection.name}`}
          subtitle={`Section Code: ${editingSection.code}`}
          size="md"
        >
          <div className="space-y-4">
            <Input label="Section Name *" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Supervisor In Charge *" value={editInCharge} onChange={(e) => setEditInCharge(e.target.value)} />
              <Input label="Supervisor Mobile *" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} />
            </div>

            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />

            <Input label="Remarks" value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} />

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {currentUser?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    const sec = editingSection;
                    setShowEditModal(false);
                    setEditingSection(null);
                    setSectionToDelete(sec);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Section</span>
                </button>
              ) : <div />}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSection(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Update Section
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* NEW EMPLOYEE JOINING MODAL (ADMIN / SECTION LEVEL) */}
      {showAddEmployeeModal && (
        <NewEmployeeJoiningModal
          isOpen={showAddEmployeeModal}
          onClose={() => setShowAddEmployeeModal(false)}
          onSuccess={(newWorker) => {
            const assignedSite = sites.find((s) => s.id === newWorker.currentSiteId);
            setToastMessage(`✓ New Employee "${newWorker.name}" enrolled successfully with Serial ${assignedSite?.code || newWorker.currentSiteId}-${newWorker.id}!`);
            setShowAddEmployeeModal(false);
          }}
        />
      )}

      {/* CONFIRM DELETE SECTION */}
      {sectionToDelete && (
        <ConfirmDialog
          isOpen={!!sectionToDelete}
          onClose={() => setSectionToDelete(null)}
          onConfirm={() => {
            deleteSection(sectionToDelete.id);
            setToastMessage(`Section "${sectionToDelete.name}" (${sectionToDelete.code}) and all deployed workers removed.`);
            setSectionToDelete(null);
          }}
          title={`Delete Section: ${sectionToDelete.name}`}
          message={`Are you sure you want to delete section "${sectionToDelete.name}" (${sectionToDelete.code})? All workers assigned to this section will also be removed. This action cannot be undone.`}
          confirmText="Delete Section"
          variant="danger"
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Sections;
