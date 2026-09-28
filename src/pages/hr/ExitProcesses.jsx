import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, Check, X, LogOut, FileText, Users, Clock, Award,
  Building2, DollarSign, UserMinus, Briefcase, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import ExportMenu from '../../components/ExportMenu';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const EXIT_TYPES = [
  { value: 'RESIGNATION', label: 'Resignation' },
  { value: 'TERMINATION', label: 'Termination' },
  { value: 'RETIREMENT', label: 'Retirement' },
  { value: 'CONTRACT_END', label: 'Contract End' },
];

const STATUS_TABS = [
  { key: '', label: 'All', icon: FileText },
  { key: 'INITIATED', label: 'Initiated', icon: Clock },
  { key: 'ACCEPTED', label: 'Accepted', icon: Check },
  { key: 'CLEARANCE', label: 'Clearance', icon: Building2 },
  { key: 'CLEARED', label: 'Cleared', icon: Check },
  { key: 'FINAL_SETTLEMENT', label: 'Final Settlement', icon: DollarSign },
  { key: 'CLOSED', label: 'Closed', icon: UserMinus },
];

export default function ExitProcesses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const isHR = [ROLES.HR, ROLES.ADMIN].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['exit-stats'],
    queryFn: () => hrApi.exitProcesses.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['exit-processes', tab],
    queryFn: () => hrApi.exitProcesses.list({ status: tab, page_size: 100 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'process_no',
      label: 'Ref No.',
      render: (r) => <span className="font-medium text-blue-700">{r.process_no}</span>,
    },
    {
      key: 'employee_name',
      label: 'Employee',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.employee_name}</p>
          <p className="text-xs text-slate-500">{r.employee_department || '—'}</p>
        </div>
      ),
    },
    {
      key: 'exit_type_display',
      label: 'Type',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {r.exit_type_display}
        </span>
      ),
    },
    {
      key: 'resignation_date',
      label: 'Resignation',
      render: (r) => formatDate(r.resignation_date),
    },
    {
      key: 'last_working_day',
      label: 'Last Day',
      render: (r) => formatDate(r.last_working_day),
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
        <StatCard label="Total" value={stats?.total ?? '—'} icon={FileText} color="brand" />
        <StatCard label="Clearance" value={stats?.clearance ?? '—'} icon={Building2} color="amber" />
        <StatCard label="Settlement" value={stats?.final_settlement ?? '—'} icon={DollarSign} color="purple" />
        <StatCard label="Closed" value={stats?.closed ?? '—'} icon={UserMinus} color="green" />
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
                filename={`exit-processes-${new Date().toISOString().slice(0, 10)}`}
                title="Exit Processes"
              />
              {isHR && (
                <button className="btn-primary" onClick={() => setModal(true)}>
                  <Plus className="w-4 h-4" /> Initiate Exit
                </button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No exit processes"
          emptyMessage="Initiate an exit process to track a departure."
          emptyIcon={LogOut}
          onRowClick={(r) => setDetail(r)}
        />
      </div>

      <CreateExitModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['exit-processes'] });
          qc.invalidateQueries({ queryKey: ['exit-stats'] });
          setModal(false);
        }}
      />

      <ExitDetailModal
        process={detail}
        onClose={() => setDetail(null)}
        isHR={isHR}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['exit-processes'] });
          qc.invalidateQueries({ queryKey: ['exit-stats'] });
        }}
      />
    </div>
  );
}


function CreateExitModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const [exitType, setExitType] = useState('RESIGNATION');

  const { data: users } = useQuery({
    queryKey: ['users-for-exit'],
    queryFn: () => coreApi.users.list({ page_size: 500, is_active_employee: true }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.exitProcesses.create(payload),
    onSuccess: () => {
      toast.success('Exit process initiated');
      reset();
      setExitType('RESIGNATION');
      onSuccess();
    },
    onError: (err) => {
      const data = err.response?.data;
      let msg = 'Failed to create';
      if (typeof data === 'string') msg = data;
      else if (data?.detail) msg = data.detail;
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
    createMutation.mutate({
      employee: values.employee,
      exit_type: exitType,
      resignation_date: values.resignation_date,
      notice_period_days: Number(values.notice_period_days || 30),
      reason: values.reason || '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Initiate Exit Process" size="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Employee" required>
          <select {...register('employee', { required: true })} className="input">
            <option value="">— Select Employee —</option>
            {users?.results?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.username})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Exit Type" required>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {EXIT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setExitType(t.value)}
                className={`p-3 rounded-lg border-2 text-left text-sm font-medium transition ${
                  exitType === t.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Resignation Date" required>
            <input type="date" {...register('resignation_date', { required: true })} className="input" />
          </FormField>
          <FormField label="Notice Period (days)" required>
            <input
              type="number"
              {...register('notice_period_days', { required: true })}
              className="input"
              defaultValue={30}
            />
          </FormField>
        </div>

        <FormField label="Reason / Context">
          <textarea rows={3} {...register('reason')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating...' : 'Initiate Exit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function ExitDetailModal({ process, onClose, isHR, onUpdate }) {
  const qc = useQueryClient();
  const [settlementModal, setSettlementModal] = useState(false);
  const [interviewModal, setInterviewModal] = useState(false);
  const [clearModal, setClearModal] = useState(null);

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      hrApi.exitProcesses.custom(id, action, payload || {}),
    onSuccess: (_, vars) => {
      toast.success(vars.action.replace(/_/g, ' '));
      qc.invalidateQueries({ queryKey: ['exit-process', process?.id] });
      onUpdate();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed'),
  });

  const { data: fresh } = useQuery({
    queryKey: ['exit-process', process?.id],
    queryFn: () => hrApi.exitProcesses.get(process.id),
    enabled: !!process?.id,
  });

  if (!process) return null;
  const p = fresh || process;
  const progress = p.clearance_progress || { total: 0, cleared: 0, percent: 0 };

  return (
    <Modal open={!!process} onClose={onClose} title={`Exit Process — ${p.process_no}`} size="lg">
      {/* Employee banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">
              {p.exit_type_display}
            </p>
            <p className="text-lg font-semibold text-slate-800">{p.employee_name}</p>
            <p className="text-xs text-slate-500">{p.employee_department || '—'} • ID: {p.employee_id}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* Timeline details */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-5">
        <div>
          <p className="text-xs text-slate-500">Resignation Date</p>
          <p className="font-medium">{formatDate(p.resignation_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Last Working Day</p>
          <p className="font-medium">{formatDate(p.last_working_day)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Notice Period</p>
          <p className="font-medium">{p.notice_period_days} days</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Accepted By</p>
          <p className="font-medium">{p.accepted_by_name || '—'}</p>
        </div>
        {p.reason && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Reason</p>
            <p className="font-medium">{p.reason}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Clearance Progress
            </span>
            <span className="text-xs text-slate-500">
              {progress.cleared} / {progress.total} departments
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Clearance list */}
      {p.clearances?.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Department</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Cleared By</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {p.clearances.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {c.department_display}
                  </td>
                  <td className="px-3 py-2">
                    {c.is_cleared ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Cleared
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {c.cleared_by_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!c.is_cleared && isHR && p.status === 'CLEARANCE' && (
                      <button
                        onClick={() => setClearModal(c)}
                        className="btn-secondary text-xs !py-1"
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exit interviews */}
      {p.interviews?.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-4 mb-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Exit Interviews
          </h4>
          {p.interviews.map((i) => (
            <div key={i.id} className="border-t border-slate-100 py-2 text-sm">
              <p className="font-medium">{formatDate(i.interview_date)} — {i.conducted_by_name}</p>
              <p className="text-slate-600 mt-1">{i.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {/* Workflow action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {p.status === 'INITIATED' && isHR && (
          <>
            <button
              onClick={() => actionMutation.mutate({ id: p.id, action: 'accept' })}
              className="btn-primary"
            >
              <Check className="w-4 h-4" /> Accept Resignation
            </button>
            <button
              onClick={() => actionMutation.mutate({ id: p.id, action: 'reject', payload: { reason: 'Not approved' } })}
              className="btn-danger"
            >
              <X className="w-4 h-4" /> Reject
            </button>
          </>
        )}
        {p.status === 'ACCEPTED' && isHR && (
          <button
            onClick={() => actionMutation.mutate({ id: p.id, action: 'initiate_clearance' })}
            className="btn-primary"
          >
            <Building2 className="w-4 h-4" /> Initiate Clearance
          </button>
        )}
        {p.status === 'CLEARED' && isHR && (
          <button
            onClick={() => setSettlementModal(true)}
            className="btn-primary"
          >
            <DollarSign className="w-4 h-4" /> Process Final Settlement
          </button>
        )}
        {p.status === 'FINAL_SETTLEMENT' && isHR && (
          <button
            onClick={() => actionMutation.mutate({ id: p.id, action: 'close' })}
            className="btn-primary"
          >
            <UserMinus className="w-4 h-4" /> Close & Deactivate
          </button>
        )}
        {['CLEARANCE', 'CLEARED', 'FINAL_SETTLEMENT'].includes(p.status) && isHR && (
          <button
            onClick={() => setInterviewModal(true)}
            className="btn-secondary"
          >
            <Briefcase className="w-4 h-4" /> Add Exit Interview
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>

      {/* Settlement modal */}
      <Modal
        open={settlementModal}
        onClose={() => setSettlementModal(false)}
        title="Process Final Settlement"
        size="sm"
      >
        <FormField label="Final Settlement Amount (GHS)" required>
          <input
            type="number"
            step="0.01"
            id="settlement-amount"
            className="input"
            placeholder="Enter amount"
            onChange={(e) => {}}
          />
        </FormField>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setSettlementModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              const amount = document.getElementById('settlement-amount')?.value;
              if (!amount) {
                toast.error('Enter amount');
                return;
              }
              actionMutation.mutate({
                id: p.id,
                action: 'process_final_settlement',
                payload: { amount },
              });
              setSettlementModal(false);
            }}
            className="btn-primary"
          >
            Process Settlement
          </button>
        </div>
      </Modal>

      {/* Interview modal */}
            {/* Interview modal */}
      <Modal
        open={interviewModal}
        onClose={() => setInterviewModal(false)}
        title="Add Exit Interview"
        size="lg"
      >
        <div className="space-y-5">
          <FormField label="Interview Date" required>
            <input
              type="date"
              id="int-date"
              className="input"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </FormField>

          {/* Rating scale helper */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Rating scale:</strong> 1 = Very Dissatisfied, 5 = Very Satisfied
          </div>

          {/* Ratings section */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" /> Job & Role
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Job Satisfaction (1-5)">
                <input type="number" min="1" max="5" id="int-job-sat" className="input" />
              </FormField>
              <FormField label="Role Clarity (1-5)">
                <input type="number" min="1" max="5" id="int-role" className="input" />
              </FormField>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" /> Management
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Supervisor Rating (1-5)">
                <input type="number" min="1" max="5" id="int-supervisor" className="input" />
              </FormField>
              <FormField label="Confidence in Leadership (1-5)">
                <input type="number" min="1" max="5" id="int-leadership" className="input" />
              </FormField>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" /> Compensation & Benefits
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Pay Fairness (1-5)">
                <input type="number" min="1" max="5" id="int-pay" className="input" />
              </FormField>
              <FormField label="Benefits Satisfaction (1-5)">
                <input type="number" min="1" max="5" id="int-benefits" className="input" />
              </FormField>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-600" /> Work Environment & Growth
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Work-Life Balance (1-5)">
                <input type="number" min="1" max="5" id="int-wlb" className="input" />
              </FormField>
              <FormField label="Team Collaboration (1-5)">
                <input type="number" min="1" max="5" id="int-team" className="input" />
              </FormField>
              <FormField label="Growth Opportunities (1-5)">
                <input type="number" min="1" max="5" id="int-growth" className="input" />
              </FormField>
              <FormField label="Training Quality (1-5)">
                <input type="number" min="1" max="5" id="int-training" className="input" />
              </FormField>
            </div>
          </div>

          {/* Open-ended */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Open Feedback</h4>
            <FormField label="Primary Reason for Leaving">
              <textarea rows={2} id="int-reason" className="input" />
            </FormField>
            <FormField label="What did you like most about working here?">
              <textarea rows={2} id="int-liked" className="input" />
            </FormField>
            <FormField label="What could we improve?">
              <textarea rows={2} id="int-improve" className="input" />
            </FormField>
            <FormField label="Is there anything that could have made you stay?">
              <textarea rows={2} id="int-stay" className="input" />
            </FormField>
            <FormField label="Additional Comments">
              <textarea rows={2} id="int-comments" className="input" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Overall Experience (1-5)">
              <input type="number" min="1" max="5" id="int-overall" className="input" />
            </FormField>
            <FormField label="Would you recommend us?">
              <select id="int-recommend" className="input">
                <option value="">— Not answered —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
            <button onClick={() => setInterviewModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                const getVal = (id) => document.getElementById(id)?.value || '';
                const getNum = (id) => {
                  const v = getVal(id);
                  return v ? parseInt(v) : null;
                };
                const recommend = getVal('int-recommend');

                actionMutation.mutate({
                  id: p.id,
                  action: 'add_interview',
                  payload: {
                    interview_date: getVal('int-date'),
                    job_satisfaction: getNum('int-job-sat'),
                    role_clarity: getNum('int-role'),
                    supervisor_rating: getNum('int-supervisor'),
                    leadership_confidence: getNum('int-leadership'),
                    pay_fairness: getNum('int-pay'),
                    benefits_satisfaction: getNum('int-benefits'),
                    work_life_balance: getNum('int-wlb'),
                    team_collaboration: getNum('int-team'),
                    growth_opportunities: getNum('int-growth'),
                    training_quality: getNum('int-training'),
                    reason_for_leaving: getVal('int-reason'),
                    what_liked_most: getVal('int-liked'),
                    what_could_improve: getVal('int-improve'),
                    could_have_stayed: getVal('int-stay'),
                    additional_comments: getVal('int-comments'),
                    overall_experience: getNum('int-overall'),
                    would_recommend: recommend === 'true' ? true : recommend === 'false' ? false : null,
                  },
                });
                setInterviewModal(false);
              }}
              className="btn-primary"
            >
              <Send className="w-4 h-4" /> Save Interview
            </button>
          </div>
        </div>
      </Modal>
      {/* Clear department modal */}
      <Modal
        open={!!clearModal}
        onClose={() => setClearModal(null)}
        title={`Clear ${clearModal?.department_display}`}
        size="sm"
      >
        <FormField label="Remarks">
          <textarea rows={2} id="clear-remarks" className="input" placeholder="Optional notes" />
        </FormField>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setClearModal(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              const remarks = document.getElementById('clear-remarks')?.value || '';
              actionMutation.mutate({
                id: p.id,
                action: 'clear_department',
                payload: { department: clearModal.department, remarks },
              });
              setClearModal(null);
            }}
            className="btn-primary"
          >
            Confirm Clear
          </button>
        </div>
      </Modal>
    </Modal>
  );
}