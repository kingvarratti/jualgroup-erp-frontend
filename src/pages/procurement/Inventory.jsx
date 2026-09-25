import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatCurrency } from '../../utils/formatters';

export default function Inventory() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search],
    queryFn: () => procurementApi.inventory.list({ search, page_size: 100 }),
    keepPreviousData: true,
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => procurementApi.inventory.create(payload),
    onSuccess: () => {
      toast.success('Item added');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setModal(false);
      reset();
    },
    onError: () => toast.error('Failed to add'),
  });

  const columns = [
    {
      key: 'part_number',
      label: 'Part No.',
      render: (r) => <span className="font-medium">{r.part_number}</span>,
    },
    { key: 'description', label: 'Description' },
    { key: 'uom', label: 'UoM' },
    {
      key: 'quantity_on_hand',
      label: 'Qty',
      render: (r) => (
        <span className={r.needs_reorder ? 'text-red-600 font-semibold' : ''}>
          {r.quantity_on_hand}
        </span>
      ),
    },
    { key: 'reorder_level', label: 'Reorder' },
    { key: 'location', label: 'Location' },
    {
      key: 'unit_cost',
      label: 'Unit Cost',
      render: (r) => formatCurrency(r.unit_cost),
    },
    {
      key: 'needs_reorder',
      label: 'Alert',
      render: (r) =>
        r.needs_reorder ? (
          <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" /> Reorder
          </span>
        ) : (
          <span className="text-xs text-green-600">OK</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          placeholder="Search part number or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-72"
        />
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="Inventory is empty"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Inventory Item">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Part Number" required>
              <input {...register('part_number', { required: true })} className="input" />
            </FormField>
            <FormField label="UoM" required>
              <input
                {...register('uom', { required: true })}
                placeholder="pcs / kg / m"
                className="input"
              />
            </FormField>
          </div>
          <FormField label="Description" required>
            <input {...register('description', { required: true })} className="input" />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Quantity">
              <input type="number" step="0.01" {...register('quantity_on_hand')} className="input" />
            </FormField>
            <FormField label="Reorder Level">
              <input type="number" step="0.01" {...register('reorder_level')} className="input" />
            </FormField>
            <FormField label="Safety Stock">
              <input type="number" step="0.01" {...register('safety_stock')} className="input" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost (GHS)">
              <input type="number" step="0.01" {...register('unit_cost')} className="input" />
            </FormField>
            <FormField label="Location">
              <input {...register('location')} placeholder="Shelf / Rack" className="input" />
            </FormField>
          </div>
          <FormField label="Category">
            <input {...register('category')} className="input" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}