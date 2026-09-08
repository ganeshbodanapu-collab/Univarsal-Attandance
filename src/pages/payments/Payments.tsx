import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendanceContext } from '../../context/AttendanceContext';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { Toast } from '../../components/common/Toast';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Plus,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import type { WorkerPayment } from '../../types';

export const Payments: React.FC = () => {
  const { workers, sites, sections, payments, updatePaymentStatus, currentUser } =
    useAttendanceContext();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filters
  const [filterSiteId, setFilterSiteId] = useState(
    currentUser?.role === 'supervisor' ? currentUser.assignedSiteId || '' : ''
  );
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // Form State
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formGrossWage, setFormGrossWage] = useState('');
  const [formAdvanceRecovery, setFormAdvanceRecovery] = useState('0');
  const [formMethod, setFormMethod] = useState<'cash' | 'bankTransfer'>('cash');
  const [formRemarks, setFormRemarks] = useState('');

  const displayPayments = payments.filter((p) => {
    if (currentUser?.role === 'supervisor' && p.siteId !== currentUser?.assignedSiteId) return false;
    if (filterSiteId && p.siteId !== filterSiteId) return false;
    if (filterSectionId && p.sectionId !== filterSectionId) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterMethod !== 'all' && p.paymentMethod !== filterMethod) return false;
    return true;
  });

  const totalGross = displayPayments.reduce((sum, p) => sum + p.grossWage, 0);
  const totalRecovery = displayPayments.reduce((sum, p) => sum + p.advanceRecovery, 0);
  const totalNet = displayPayments.reduce((sum, p) => sum + p.netPay, 0);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const pendingPaymentsAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPay, 0);

  const processingPaymentsCount = payments.filter((p) => p.status === 'processing').length;
  const processingPaymentsAmount = payments
    .filter((p) => p.status === 'processing')
    .reduce((sum, p) => sum + p.netPay, 0);

  const paidPaymentsCount = payments.filter((p) => p.status === 'paid').length;

  const handleSave = () => {
    const gross = parseFloat(formGrossWage);
    const rec = parseFloat(formAdvanceRecovery) || 0;
    const selectedWorker = workers.find((w) => w.id === formWorkerId);

    if (!formWorkerId || isNaN(gross) || gross <= 0) {
      alert('Please select worker and enter gross wage.');
      return;
    }

    const net = Math.max(0, gross - rec);
    setToastMessage(`Payment of ₹${net.toLocaleString()} recorded for ${selectedWorker?.name}.`);
    setShowAddModal(false);

    // Reset Form
    setFormWorkerId('');
    setFormGrossWage('');
    setFormAdvanceRecovery('0');
    setFormMethod('cash');
    setFormRemarks('');
  };

  const columns: Column<WorkerPayment>[] = [
    { header: 'S.No', render: (_, idx) => <span className="text-xs text-slate-400 font-medium">{idx + 1}</span> },
    {
      header: 'Payment ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.id}</span>,
    },
    {
      header: 'Worker Name & ID',
      render: (row) => {
        const w = workers.find((wk) => wk.id === row.workerId);
        const s = sites.find((st) => st.id === row.siteId);
        const serial = `${s?.code || row.siteId}-${row.workerId}`;
        return (
          <div>
            <Link to={`/workers/${row.workerId}`} className="font-bold text-xs text-slate-900 hover:text-blue-600">
              {w?.name || row.workerName || row.workerId}
            </Link>
            <span className="block text-[11px] font-mono text-slate-500">{serial}</span>
          </div>
        );
      },
    },
    {
      header: 'Site & Section',
      render: (row) => {
        const site = sites.find((s) => s.id === row.siteId);
        const sec = sections.find((s) => s.id === row.sectionId);
        return (
          <div>
            <span className="text-xs font-semibold text-slate-800 block">{sec?.name || 'Section'}</span>
            <span className="text-[10px] text-slate-400">{site?.name || row.siteId}</span>
          </div>
        );
      },
    },
    { header: 'Payout Date', accessor: 'date', sortable: true },
    { header: 'Gross Wage', render: (row) => <span className="font-bold text-xs text-slate-900">₹{row.grossWage}</span> },
    {
      header: 'Advance Recovery',
      render: (row) => (
        <span className={`font-bold text-xs ${row.advanceRecovery > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {row.advanceRecovery > 0 ? `-₹${row.advanceRecovery}` : '₹0'}
        </span>
      ),
    },
    { header: 'Net Payout', render: (row) => <span className="font-black text-xs text-emerald-700">₹{row.netPay}</span> },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      render: (row) => (
        <span
          className={`capitalize text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center space-x-1 ${
            row.paymentMethod === 'cash'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {row.paymentMethod === 'cash' ? <Wallet className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
          <span>{row.paymentMethod === 'bankTransfer' ? 'Bank Transfer' : 'Cash Handover'}</span>
        </span>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'status',
      render: (row) => (
        <div className="space-y-0.5">
          <StatusBadge status={row.status} />
          {row.status === 'processing' && row.processedAt && (
            <span className="block text-[10px] text-blue-600 font-medium">{row.processedAt}</span>
          )}
          {row.status === 'paid' && row.paidAt && (
            <span className="block text-[10px] text-emerald-600 font-medium">{row.paidAt}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions & Workflow',
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  updatePaymentStatus(row.id, 'processing');
                  setToastMessage(`Payment ${row.id} moved to Processing status.`);
                }}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1"
                title="Move to processing"
              >
                <Clock className="h-3 w-3" />
                <span>Process</span>
              </button>

              <button
                onClick={() => {
                  updatePaymentStatus(row.id, 'paid');
                  setToastMessage(`Payment ${row.id} marked as Paid & Disbursed.`);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-1"
                title="Disburse payment"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Mark Paid</span>
              </button>
            </>
          )}

          {row.status === 'processing' && (
            <button
              onClick={() => {
                updatePaymentStatus(row.id, 'paid');
                setToastMessage(`Payment ${row.id} disbursed successfully.`);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-1"
              title="Disburse payment"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Disburse / Paid</span>
            </button>
          )}

          {row.status === 'paid' && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold inline-flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Disbursed</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments And Status</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {currentUser?.role === 'supervisor'
              ? `Wage disbursement status and payment processing for Site ${currentUser?.assignedSiteId}.`
              : 'Execute wage payouts, monitor Pending and Processing payments, and track cleared disbursements.'}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Record Wage Payout</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Gross Wages"
          value={`₹${totalGross.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          description="Gross attendance pay"
        />
        <StatCard
          title="Advance Deductions"
          value={`-₹${totalRecovery.toLocaleString()}`}
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
          description="Recovered debt"
        />
        <StatCard
          title="Net Cash Disbursed"
          value={`₹${totalNet.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          description="Paid out to workers"
        />
        <StatCard
          title="Pending Payments"
          value={`${pendingPaymentsCount} Payouts`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          description={`₹${pendingPaymentsAmount.toLocaleString()} pending`}
        />
        <StatCard
          title="Processing Payments"
          value={`${processingPaymentsCount} Payouts`}
          icon={<RefreshCw className="h-5 w-5 text-blue-600" />}
          description={`₹${processingPaymentsAmount.toLocaleString()} in batch (${paidPaymentsCount} cleared)`}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center gap-3">
        {currentUser?.role === 'admin' && (
          <select
            value={filterSiteId}
            onChange={(e) => {
              setFilterSiteId(e.target.value);
              setFilterSectionId('');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Project Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterSectionId}
          onChange={(e) => setFilterSectionId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Sections</option>
          {sections
            .filter((sec) => !filterSiteId || sec.siteId === filterSiteId)
            .map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name} ({sec.code})
              </option>
            ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Payment Statuses</option>
          <option value="pending">Pending Payments Only</option>
          <option value="processing">Processing Payments Only</option>
          <option value="paid">Paid Only</option>
        </select>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash Handover</option>
          <option value="bankTransfer">Bank Transfer</option>
        </select>
      </div>

      {/* Payments Data Table */}
      <DataTable
        columns={columns}
        data={displayPayments}
        emptyTitle="No wage payments recorded"
        emptyDescription="There are no payment records matching your filter selection."
      />

      {/* DISBURSEMENT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Wage Disbursement"
        subtitle="Log gross wage and advance deduction for worker payment."
        icon={<CreditCard className="h-5 w-5" />}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Select Worker *"
            value={formWorkerId}
            onChange={(e) => setFormWorkerId(e.target.value)}
            options={[
              { value: '', label: 'Choose worker...' },
              ...workers.map((w) => ({
                value: w.id,
                label: `${w.id} - ${w.name} (₹${w.dailyWage}/day)`,
              })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              label="Payout Date *"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <Input
              label="Gross Wage Amount (₹) *"
              type="number"
              value={formGrossWage}
              onChange={(e) => setFormGrossWage(e.target.value)}
              placeholder="e.g. 550"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Advance Recovery Deducted (₹)"
              type="number"
              value={formAdvanceRecovery}
              onChange={(e) => setFormAdvanceRecovery(e.target.value)}
              placeholder="e.g. 100"
            />
            <Select
              label="Payment Method"
              value={formMethod}
              onChange={(e) => setFormMethod(e.target.value as any)}
              options={[
                { value: 'cash', label: 'Cash on Site' },
                { value: 'bankTransfer', label: 'Bank Transfer (IMPS/NEFT)' },
              ]}
            />
          </div>

          <Input
            label="Remarks"
            value={formRemarks}
            onChange={(e) => setFormRemarks(e.target.value)}
            placeholder="Voucher ref, notes..."
          />

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
              Confirm Disbursement
            </button>
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default Payments;
