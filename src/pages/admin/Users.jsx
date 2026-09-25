import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { ROLE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

export default function Users() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pwModal, setPwModal] = useState(null);
  const [filters, setFilters] = useState({ search: '', role: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['users', filters],
    queryFn: () =>
      coreApi.users.list({
        search: filters.search,
        role: filters.role,
        page_size: 100,
      }),
    keepPreviousData: true,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => coreApi.branches.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const openCreate = () => {
    setEditing(null);
    reset({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'SALES_ENG',
      branch: '',
      department: '',
      phone: '',
      password: '',
      is_active_employee: true,
    });
    setModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    reset({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      branch: user.branch || '',
      department: user.department,
      phone: user.phone,
      is_active_employee: user.is_active_employee,
    });
    setModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? coreApi.users.update(editing.id, payload) : coreApi.users.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setModal(false);
      reset();
      setEditing(null);
    },
    onError: (err) => {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(', ')
        : 'Failed to save';
      toast.error(msg);
    },
  });

  const onSubmit = (values) => {
    const payload = { ...values };
    if (editing && !payload.password) {
      delete payload.password;
    }
    if (!payload.branch) {
      payload.branch = null;
    }
    saveMutation.mutate(payload);
  };

  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }) => coreApi.users.custom(id, 'reset_password', { password }),
    onSuccess: () => {
      toast.success('Password reset');
      setPwModal(null);
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const columns = [
    {
      key: 'username',
      label: 'Username',
      render: (r) => <span className="font-medium">{r.username}</span>,
    },
    {
      key: 'full_name',
      label: 'Name',
      render: (r) => `${r.first_name} ${r.last_name}`.trim() || '—',
    },
    { key: 'email', label: 'Email' },
    { key: 'role_display', label: 'Role' },
    { key: 'branch_name', label: 'Branch', render: (r) => r.branch_name || '—' },
    {
      key: 'is_active_employee',
      label: 'Status',
      render: (r) =>
        r.is_active_employee ? (
          <span className="text-green-600 text-xs font-semibold">Active</span>
        ) : (
          <span className="text-red-600 text-xs font-semibold">Inactive</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input w-64"
          />
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="input w-56"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No users found"
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => openEdit(r)}
                className="btn-ghost !p-2 text-blue-600"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPwModal(r)}
                className="btn-ghost !p-2 text-amber-600"
                title="Reset Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit User — ${editing.username}` : 'Create New User'}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Username" required error={errors.username}>
              <input
                {...register('username', { required: 'Required' })}
                className="input"
                disabled={!!editing}
              />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <input
                type="email"
                {...register('email', { required: 'Required' })}
                className="input"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name">
              <input {...register('first_name')} className="input" />
            </FormField>
            <FormField label="Last Name">
              <input {...register('last_name')} className="input" />
            </FormField>
          </div>

          <FormField label="Role" required error={errors.role}>
            <select
              {...register('role', { required: 'Required' })}
              className="input"
            >
              <option value="">— Select Role —</option>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Branch">
              <select {...register('branch')} className="input">
                <option value="">— None —</option>
                {branches?.results?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Department">
              <input {...register('department')} className="input" />
            </FormField>
          </div>

          <FormField label="Phone">
            <input {...register('phone')} className="input" />
          </FormField>

          {!editing && (
            <FormField label="Password" required error={errors.password}>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required for new users',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
                className="input"
              />
            </FormField>
          )}

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active_employee')} />
              Active Employee
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : editing
                ? 'Update User'
                : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={pwModal}
        onClose={() => setPwModal(null)}
        onSubmit={(password) => resetPwMutation.mutate({ id: pwModal.id, password })}
        loading={resetPwMutation.isPending}
      />
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onSubmit, loading }) {
  const [password, setPassword] = useState('');

  if (!user) return null;

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Reset Password — ${user.username}`}
      size="sm"
    >
      <p className="text-sm text-slate-600 mb-4">
        Set a new password for <strong>{user.username}</strong>.
      </p>
      <FormField label="New Password" required>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoFocus
          placeholder="At least 6 characters"
        />
      </FormField>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => onSubmit(password)}
          disabled={loading || password.length < 6}
          className="btn-primary"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </Modal>
  );
}