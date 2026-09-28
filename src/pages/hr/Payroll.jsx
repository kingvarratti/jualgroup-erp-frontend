import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, DollarSign, Download, Check, Send, Play, Users, Clock,
  Award, Banknote, FileText, Calculator, TrendingUp, Eye, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import ExportMenu from '../../components/ExportMenu';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_TABS = [
  { key: '', label: 'All', icon: FileText },
  { key: 'OPEN', label: 'Open', icon: Clock },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: Check },
  { key: 'PAID', label: 'Paid', icon: Award },
];

export default function Payroll() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailCycle, setDetailCycle] = useState(null);

  const isHR = [ROLES.HR, ROLES.ADMIN].includes(user?.role);
  const isFinance = [ROLES.FINANCE, ROLES.ADMIN, ROLES.ACCOUNTANT].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['payroll-stats'],
    queryFn: () => hrApi.payrollCycles.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-cycles', tab],
    queryFn: () => hrApi.payrollCycles.list({ status: tab, page_size: 100 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'period',
      label: 'Period',
      render: (r) => (
        <span className="font-medium text-slate-800">
          {MONTHS[r.month - 1]} {r.year}
        </span>
      ),
    },
    {
      key: 'payslip_count',
      label: 'Employees',
      className: 'text-center',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
          <Users className="w-3 h-3" /> {r.payslip_count}
        </span>
      ),
    },
    {
      key: 'total_gross',
      label: 'Total Gross',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_gross),
    },
    {
      key: 'total_deductions',
      label: 'Deductions',
      className: 'text-right',
      render: (r) => (
        <span className="text-red-600">{formatCurrency(r.total_deductions)}</span>
      ),
    },
    {
      key: 'total_net',
      label: 'Total Net',
      className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-blue-700">
          {formatCurrency(r.total_net)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cycles"
          value={stats?.total_cycles ?? '—'}
          icon={FileText}
          color="brand"
        />
        <StatCard
          label="Open"
          value={stats?.open ?? '—'}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Pending Approval"
          value={stats?.pending_approval ?? '—'}
          icon={Clock}
          color="purple"
        />
        <StatCard
          label="Paid"
          value={stats?.paid ?? '—'}
          icon={Award}
          color="green"
        />
      </div>

      <div className="card">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {STATUS_TABS.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <ExportMenu
                columns={columns}
                data={data?.results || []}
                filename={`payroll-cycles-${new Date().toISOString().slice(0, 10)}`}
                title="Payroll Cycles"
              />
              {isHR && (
                <button className="btn-primary" onClick={() => setModal(true)}>
                  <Plus className="w-4 h-4" /> New Payroll Cycle
                </button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No payroll cycles"
          emptyMessage="Create a payroll cycle to start processing."
          emptyIcon={DollarSign}
          onRowClick={(r) => setDetailCycle(r)}
        />
      </div>

      <CreatePayrollModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['payroll-cycles'] });
          qc.invalidateQueries({ queryKey: ['payroll-stats'] });
          setModal(false);
        }}
      />

      <PayrollDetailModal
        cycle={detailCycle}
        onClose={() => setDetailCycle(null)}
        isHR={isHR}
        isFinance={isFinance}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['payroll-cycles'] });
          qc.invalidateQueries({ queryKey: ['payroll-stats'] });
        }}
      />
    </div>
  );
}


function CreatePayrollModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.payrollCycles.create(payload),
    onSuccess: () => {
      toast.success('Payroll cycle created');
      reset();
      onSuccess();
    },
    onError: (err) => {
      const msg = err.response?.data?.non_field_errors?.[0] || 'Failed to create cycle';
      toast.error(msg);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Payroll Cycle" size="md">
      <form onSubmit={handleSubmit((v) => createMutation.mutate({
        month: Number(v.month),
        year: Number(v.year),
        notes: v.notes || '',
      }))}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Month" required>
            <select {...register('month', { required: true })} className="input" defaultValue={currentMonth}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Year" required>
            <input
              type="number"
              {...register('year', { required: true })}
              className="input"
              defaultValue={currentYear}
            />
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea rows={2} {...register('notes')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function PayrollDetailModal({ cycle, onClose, isHR, isFinance, onUpdate }) {
  const qc = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      hrApi.payrollCycles.custom(id, action, payload || {}),
    onSuccess: (data, vars) => {
      const msgs = {
        collect_data: `Collected data for ${data?.created || 0} employees`,
        calculate: 'Calculated all payslips',
        submit_for_approval: 'Submitted for approval',
        approve: 'Payroll approved',
        process: 'Payroll processed',
        mark_paid: 'Marked as paid',
      };
      toast.success(msgs[vars.action] || 'Done');
      qc.invalidateQueries({ queryKey: ['payroll-cycle', cycle?.id] });
      onUpdate();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Action failed');
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['payroll-cycle', cycle?.id],
    queryFn: () => hrApi.payrollCycles.get(cycle.id),
    enabled: !!cycle?.id,
  });

  if (!cycle) return null;
  const c = fresh || cycle;

  const canCollect = c.status === 'OPEN';
  const canCalculate = c.status === 'COLLECTING';
  const canSubmit = c.status === 'CALCULATED';
  const canApprove = c.status === 'PENDING_APPROVAL' && (isHR || isFinance);
  const canProcess = c.status === 'APPROVED' && isHR;
  const canMarkPaid = c.status === 'PROCESSED' && isHR;
  const canDownload = ['CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'PAID'].includes(c.status);

  return (
    <Modal
      open={!!cycle}
      onClose={onClose}
      title={`Payroll — ${MONTHS[c.month - 1]} ${c.year}`}
      size="xl"
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Gross Payroll</p>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {formatCurrency(c.total_gross)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700 uppercase tracking-wide">Total Deductions</p>
          <p className="text-lg font-bold text-red-700 mt-1">
            {formatCurrency(c.total_deductions)}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-700 uppercase tracking-wide">Net Payable</p>
          <p className="text-lg font-bold text-green-700 mt-1">
            {formatCurrency(c.total_net)}
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
          <div className="mt-1">
            <StatusBadge status={c.status} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {c.payslip_count} employees in this cycle
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {canCollect && isHR && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'collect_data' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Users className="w-4 h-4" /> Collect Employee Data
            </button>
          )}
          {canCalculate && isHR && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'calculate' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Calculator className="w-4 h-4" /> Calculate Payroll
            </button>
          )}
          {canSubmit && isHR && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'submit_for_approval' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Send className="w-4 h-4" /> Submit for Approval
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'approve' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Check className="w-4 h-4" /> Approve Payroll
            </button>
          )}
          {canProcess && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'process' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Play className="w-4 h-4" /> Process Payroll
            </button>
          )}
          {canMarkPaid && (
            <button
              onClick={() => actionMutation.mutate({ id: c.id, action: 'mark_paid' })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              <Award className="w-4 h-4" /> Mark as Paid
            </button>
          )}
          {canDownload && (
            <button
              onClick={() => hrApi.payrollCycles.bankTransferCsv(c.id, `bank-transfers-${c.year}-${c.month}.csv`)}
              className="btn-secondary"
            >
              <Banknote className="w-4 h-4" /> Bank Transfer CSV
            </button>
          )}
        </div>
      </div>

      {/* Payslips table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Payslips</p>
          <span className="text-xs text-slate-500">{c.payslips?.length || 0} records</span>
        </div>

        {c.payslips?.length ? (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 uppercase">Employee</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">Basic</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">Allow.</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">Gross</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">SSNIT</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">PAYE</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600 uppercase">Net</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {c.payslips.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">{p.employee_name}</p>
                      <p className="text-slate-500 text-[10px]">{p.employee_id}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(p.basic_salary)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(p.allowances)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(p.gross_pay)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(p.ssnit_employee)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(p.paye_tax)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(p.net_pay)}</td>
                    <td className="px-3 py-2 text-center">
                      <EditPayslipButton payslip={p} onSuccess={() => qc.invalidateQueries({ queryKey: ['payroll-cycle', c.id] })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            No payslips yet. Click "Collect Employee Data" to populate.
          </p>
        )}
      </div>

      <div className="flex justify-end mt-5">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}


function EditPayslipButton({ payslip, onSuccess }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost !p-1 text-blue-600"
        title="Edit Payslip"
      >
        <Eye className="w-3 h-3" />
      </button>
      <EditPayslipModal
        payslip={payslip}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
}


function EditPayslipModal({ payslip, open, onClose, onSuccess }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      basic_salary: payslip.basic_salary,
      allowances: payslip.allowances,
      overtime: payslip.overtime,
      bonus: payslip.bonus,
      loan_deduction: payslip.loan_deduction,
      other_deductions: payslip.other_deductions,
      bank_name: payslip.bank_name,
      bank_account: payslip.bank_account,
      notes: payslip.notes,
    },
  });

  const mutation = useMutation({
    mutationFn: (payload) => hrApi.payslips.update(payslip.id, payload),
    onSuccess: () => {
      toast.success('Payslip updated');
      onSuccess();
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <Modal open={open} onClose={onClose} title={`Edit Payslip — ${payslip.employee_name}`} size="md">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Earnings</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Basic Salary">
            <input type="number" step="0.01" {...register('basic_salary')} className="input" />
          </FormField>
          <FormField label="Allowances">
            <input type="number" step="0.01" {...register('allowances')} className="input" />
          </FormField>
          <FormField label="Overtime">
            <input type="number" step="0.01" {...register('overtime')} className="input" />
          </FormField>
          <FormField label="Bonus">
            <input type="number" step="0.01" {...register('bonus')} className="input" />
          </FormField>
        </div>

        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-3">Deductions (SSNIT & PAYE auto-calculated)</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Loan Deduction">
            <input type="number" step="0.01" {...register('loan_deduction')} className="input" />
          </FormField>
          <FormField label="Other Deductions">
            <input type="number" step="0.01" {...register('other_deductions')} className="input" />
          </FormField>
        </div>

        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-3">Banking</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bank Name">
            <input {...register('bank_name')} className="input" placeholder="e.g. Ecobank" />
          </FormField>
          <FormField label="Account Number">
            <input {...register('bank_account')} className="input" />
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea rows={2} {...register('notes')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : 'Save Payslip'}
          </button>
        </div>
      </form>
    </Modal>
  );
}