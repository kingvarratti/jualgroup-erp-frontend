import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, Clock, UserCheck, Users, Calendar, Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function LeaveApprovals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isHR = [ROLES.HR, ROLES.ADMIN].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: () => hrApi.leaveApplications.pendingForMe(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }) =>
      hrApi.leaveApplications.custom(id, action),
    onSuccess: (_, vars) => {
      toast.success(`${vars.action.replace('_', ' ')} ✓`);
      qc.invalidateQueries({ queryKey: ['pending-leaves'] });
      setSelected(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      hrApi.leaveApplications.custom(id, 'reject_application', { reason }),
    onSuccess: () => {
      toast.success('Application rejected');
      qc.invalidateQueries({ queryKey: ['pending-leaves'] });
      setRejectModal(null);
      setSelected(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject'),
  });

  const columns = [
    {
      key: 'application_no',
      label: 'App No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.application_no}</span>
      ),
    },
    {
      key: 'employee_name',
      label: 'Employee',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
            {(r.employee_name || 'U')[0]}
          </div>
          <span className="text-sm font-medium">{r.employee_name || 'User'}</span>
        </div>
      ),
    },
    { key: 'leave_type_name', label: 'Type' },
    {
      key: 'period',
      label: 'Period',
      render: (r) => (
        <span className="text-sm">
          {formatDate(r.start_date)} → {formatDate(r.end_date)}
        </span>
      ),
    },
    {
      key: 'days_requested',
      label: 'Days',
      className: 'text-right',
      render: (r) => (
        <span className="font-semibold">{r.days_requested}</span>
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
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold">Leave Approvals</h2>
        <p className="text-amber-100 text-sm mt-1">
          {isHR
            ? 'Applications awaiting your final HR approval'
            : 'Applications from your team awaiting your approval'}
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600" />
            Pending Applications
          </h3>
          <span className="text-xs text-slate-500">
            {data?.length || 0} awaiting action
          </span>
        </div>

        <DataTable
          columns={columns}
          data={data}
          loading={isLoading}
          emptyTitle="No pending applications"
          emptyMessage="You're all caught up. 🎉"
          emptyIcon={Check}
          onRowClick={(r) => setSelected(r)}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              {r.status === 'PENDING' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    approveMutation.mutate({ id: r.id, action: 'supervisor_approve' });
                  }}
                  className="btn-ghost !p-2 text-green-600"
                  title="Supervisor Approve"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              )}
              {r.status === 'SUPERVISOR_APPROVED' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      approveMutation.mutate({ id: r.id, action: 'hod_approve' });
                    }}
                    className="btn-ghost !p-2 text-purple-600"
                    title="HOD Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  {isHR && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approveMutation.mutate({ id: r.id, action: 'hr_approve' });
                      }}
                      className="btn-ghost !p-2 text-blue-600"
                      title="HR Approve (final)"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              {r.status === 'HOD_APPROVED' && isHR && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    approveMutation.mutate({ id: r.id, action: 'hr_approve' });
                  }}
                  className="btn-ghost !p-2 text-blue-600"
                  title="HR Approve (final)"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectModal(r);
                }}
                className="btn-ghost !p-2 text-red-600"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Leave Application — ${selected.application_no}`}
          size="md"
        >
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Employee</p>
              <p className="font-medium">{selected.employee_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Leave Type</p>
              <p className="font-medium">{selected.leave_type_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Start Date</p>
              <p className="font-medium">{formatDate(selected.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">End Date</p>
              <p className="font-medium">{formatDate(selected.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Days Requested</p>
              <p className="font-bold text-slate-800">{selected.days_requested}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <StatusBadge status={selected.status} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Reason</p>
              <p className="text-slate-700 mt-1">{selected.reason}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Submitted</p>
              <p className="text-slate-700">{formatDateTime(selected.created_at)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setSelected(null)} className="btn-secondary">
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Leave Application"
        size="sm"
      >
        <FormField label="Rejection Reason" required>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="input"
            placeholder="Why is this being rejected?"
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <button onClick={() => setRejectModal(null)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() =>
              rejectMutation.mutate({
                id: rejectModal.id,
                reason: rejectReason,
              })
            }
            disabled={!rejectReason.trim() || rejectMutation.isPending}
            className="btn-danger"
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </Modal>
    </div>
  );
}