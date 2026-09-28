import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Calendar, Plus, Check, X, Clock, AlertTriangle, Sun, Snowflake,
  TrendingDown, Info, Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

export default function MyLeave() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [applyModal, setApplyModal] = useState(false);

  const currentYear = new Date().getFullYear();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['leave-summary', currentYear],
    queryFn: () => hrApi.leaveBalances.mySummary(currentYear),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => hrApi.leaveTypes.list(),
  });

  const totals = summary?.totals || { entitled: 0, used: 0, balance: 0 };
  const balances = summary?.balances || [];
  const applications = summary?.applications || [];

  const annualBalance = balances.find((b) => b.leave_type_code === 'ANNUAL') || {};
  const mandatoryBalance = balances.find((b) => b.leave_type_code === 'MANDATORY') || {};

  const columns = [
    {
      key: 'application_no',
      label: 'App No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.application_no}</span>
      ),
    },
    { key: 'leave_type_name', label: 'Type' },
    { key: 'start_date', label: 'From', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'To', render: (r) => formatDate(r.end_date) },
    {
      key: 'days_requested',
      label: 'Days',
      className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.days_requested}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'rejection_reason',
      label: 'Notes',
      render: (r) =>
        r.rejection_reason ? (
          <span className="text-xs text-red-600 line-clamp-1 max-w-xs">
            {r.rejection_reason}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Welcome, {user?.first_name || user?.username}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Your leave summary for {currentYear}
            </p>
          </div>
          <button
            onClick={() => setApplyModal(true)}
            className="bg-white text-blue-700 hover:bg-blue-50 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Balance"
          value={`${totals.balance} days`}
          icon={Calendar}
          color="brand"
          hint={`of ${totals.entitled} entitled this year`}
        />
        <StatCard
          label="Regular Leave"
          value={`${annualBalance.balance ?? 0} days`}
          icon={Briefcase}
          color="green"
          hint={`Used: ${annualBalance.used_days ?? 0} / 15`}
        />
        <StatCard
          label="Mandatory Holiday"
          value={`${mandatoryBalance.balance ?? 0} days`}
          icon={Snowflake}
          color="purple"
          hint={`Used: ${mandatoryBalance.used_days ?? 0} / 8`}
        />
        <StatCard
          label="Days Used"
          value={`${totals.used} days`}
          icon={TrendingDown}
          color="amber"
          hint="Total consumed"
        />
      </div>

      {/* Info banner about mandatory holiday */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">
            Mandatory Holiday Rules
          </p>
          <p className="text-blue-700 mt-1">
            You have <strong>15 days</strong> of regular leave (available year-round)
            and <strong>8 days</strong> of mandatory holiday. The mandatory holiday
            can only be taken during the <strong>December festive period through early January</strong>.
          </p>
        </div>
      </div>

      {/* Balance cards detailed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {balances
          .filter((b) => ['ANNUAL', 'MANDATORY'].includes(b.leave_type_code))
          .map((b) => {
          const pct = b.entitled_days > 0
            ? Math.round((b.used_days / b.entitled_days) * 100)
            : 0;
          const isMandatory = b.is_mandatory_holiday;

          return (
            <div key={b.id} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isMandatory
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isMandatory ? (
                      <Snowflake className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {b.leave_type_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isMandatory
                        ? 'Dec festive → Early Jan only'
                        : 'Available year-round'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Remaining
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {b.balance}
                      <span className="text-sm text-slate-500 font-normal ml-1">
                        days
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Used</p>
                    <p className="text-lg font-semibold text-slate-700">
                      {b.used_days} / {b.entitled_days}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      pct >= 90
                        ? 'bg-red-500'
                        : pct >= 60
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">{pct}% used</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Application history */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">My Leave Applications — {currentYear}</h3>
          <span className="text-xs text-slate-500">
            {applications.length} total
          </span>
        </div>

        <DataTable
          columns={columns}
          data={applications}
          loading={isLoading}
          emptyTitle="No applications yet"
          emptyMessage="You haven't applied for leave this year."
          emptyIcon={Calendar}
        />
      </div>

      <ApplyLeaveModal
        open={applyModal}
        onClose={() => setApplyModal(false)}
        leaveTypes={leaveTypes?.results || []}
        balances={balances}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['leave-summary'] });
          setApplyModal(false);
        }}
      />
    </div>
  );
}


function ApplyLeaveModal({ open, onClose, leaveTypes, balances, onSuccess }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const [leaveTypeId, setLeaveTypeId] = useState('');

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const daysRequested = watch('days_requested');

  const selectedBalance = balances.find((b) => b.leave_type === leaveTypeId);
  const remaining = selectedBalance?.balance ?? 0;
  const requested = parseFloat(daysRequested) || 0;
  const insufficient = requested > remaining;

  // Check mandatory holiday window
  const isMandatory = selectedBalance?.is_mandatory_holiday;
  let outsideWindow = false;
  if (isMandatory && startDate) {
    const d = new Date(startDate);
    const month = d.getMonth() + 1; // 1-12
    if (month !== 12 && month !== 1) {
      outsideWindow = true;
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.leaveApplications.create(payload),
    onSuccess: () => {
      toast.success('Leave application submitted');
      reset();
      setLeaveTypeId('');
      onSuccess();
    },
    onError: (err) => {
      const data = err.response?.data;
      let msg = 'Failed to submit';
      if (typeof data === 'string') msg = data;
      else if (data?.error) msg = data.error;
      else if (data && typeof data === 'object') {
        const parts = [];
        Object.entries(data).forEach(([k, v]) => {
          parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        });
        msg = parts.join(' • ');
      }
      toast.error(msg, { duration: 6000 });
    },
  });

  const onSubmit = (values) => {
    if (!leaveTypeId) {
      toast.error('Select a leave type');
      return;
    }
    if (insufficient) {
      toast.error(`Insufficient balance. You have ${remaining} days.`);
      return;
    }
    if (outsideWindow) {
      toast.error('Mandatory Holiday can only be taken in December or January');
      return;
    }
    createMutation.mutate({
      leave_type: leaveTypeId,
      start_date: values.start_date,
      end_date: values.end_date,
      days_requested: values.days_requested,
      reason: values.reason,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for Leave"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Leave Type" required error={errors.leave_type}>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="input"
            required
          >
            <option value="">— Select Leave Type —</option>
            {leaveTypes.map((lt) => {
              const bal = balances.find((b) => b.leave_type === lt.id);
              return (
                <option key={lt.id} value={lt.id}>
                  {lt.name} — {bal?.balance ?? 0} days remaining
                </option>
              );
            })}
          </select>
        </FormField>

        {/* Balance preview */}
        {selectedBalance && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Available balance:</span>
              <span className="font-bold text-slate-800">
                {remaining} / {selectedBalance.entitled_days} days
              </span>
            </div>
            {selectedBalance.is_mandatory_holiday && (
              <p className="text-xs text-purple-700 mt-2 flex items-center gap-1">
                <Snowflake className="w-3 h-3" />
                Only usable December through early January
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" required error={errors.start_date}>
            <input
              type="date"
              {...register('start_date', { required: 'Required' })}
              className="input"
            />
          </FormField>
          <FormField label="End Date" required error={errors.end_date}>
            <input
              type="date"
              {...register('end_date', { required: 'Required' })}
              className="input"
            />
          </FormField>
        </div>

        <FormField label="Days Requested" required error={errors.days_requested}>
          <input
            type="number"
            step="0.5"
            {...register('days_requested', { required: 'Required' })}
            className="input"
          />
        </FormField>

        {/* Warnings */}
        {insufficient && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">
              You only have <strong>{remaining} days</strong> available. Reduce the days or choose a different leave type.
            </p>
          </div>
        )}

        {outsideWindow && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700">
              Mandatory Holiday can only be taken in <strong>December or January</strong>. Please adjust the start date or choose regular Annual Leave instead.
            </p>
          </div>
        )}

        <FormField label="Reason" required error={errors.reason}>
          <textarea
            rows={3}
            {...register('reason', { required: 'Required' })}
            className="input"
            placeholder="Why are you taking this leave?"
          />
        </FormField>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
          <p>
            <strong>Approval chain:</strong> Your line manager will review first,
            then HOD (if required), then HR. You'll see the status update here.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || insufficient || outsideWindow}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}