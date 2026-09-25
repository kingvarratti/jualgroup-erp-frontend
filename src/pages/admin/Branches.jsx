import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export default function Branches() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
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
    reset({ name: '', location: '', is_active: true });
    setModal(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    reset({
      name: branch.name,
      location: branch.location,
      is_active: branch.is_active,
    });
    setModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? coreApi.branches.update(editing.id, payload)
        : coreApi.branches.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Branch updated' : 'Branch created');
      qc.invalidateQueries({ queryKey: ['branches'] });
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

  const deleteMutation = useMutation({
    mutationFn: (id) => coreApi.branches.remove(id),
    onSuccess: () => {
      toast.success('Branch deleted');
      qc.invalidateQueries({ queryKey: ['branches'] });
      setConfirmDelete(null);
    },
    onError: () => toast.error('Failed to delete (it may have linked users)'),
  });

  const columns = [
    {
      key: 'name',
      label: 'Branch',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: 'location', label: 'Location' },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) =>
        r.is_active ? (
          <span className="text-green-600 text-xs font-semibold">Active</span>
        ) : (
          <span className="text-red-600 text-xs font-semibold">Inactive</span>
        ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (r) => formatDate(r.created_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Branch
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No branches yet"
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
                onClick={() => setConfirmDelete(r)}
                className="btn-ghost !p-2 text-red-600"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit Branch — ${editing.name}` : 'Create New Branch'}
        size="sm"
      >
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          <FormField label="Branch Name" required error={errors.name}>
            <input
              {...register('name', { required: 'Required' })}
              className="input"
              placeholder="e.g. Accra HQ"
            />
          </FormField>

          <FormField label="Location" required error={errors.location}>
            <input
              {...register('location', { required: 'Required' })}
              className="input"
              placeholder="e.g. Industrial Area, Accra"
            />
          </FormField>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active')} />
              Active
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
                ? 'Update Branch'
                : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        title="Delete Branch?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}