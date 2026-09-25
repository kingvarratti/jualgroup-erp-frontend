import { Plus, Building2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';

export default function Suppliers() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => procurementApi.suppliers.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => procurementApi.suppliers.create(payload),
    onSuccess: () => {
      toast.success('Supplier added');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setModal(false);
      reset();
    },
  });

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: 'contact_person', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'country', label: 'Country' },
    {
      key: 'is_international',
      label: 'Type',
      render: (r) => (r.is_international ? 'International' : 'Local'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No suppliers registered"
          emptyMessage="Add your first supplier to start raising RFQs and purchase orders."
          emptyIcon={Building2}
          emptyAction={
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus className="w-4 h-4" /> Add First Supplier
            </button>
          }
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Supplier">
        <form
          onSubmit={handleSubmit((v) =>
            create.mutate({ ...v, is_international: v.is_international === 'true' })
          )}
        >
          <FormField label="Name" required>
            <input {...register('name', { required: true })} className="input" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Person">
              <input {...register('contact_person')} className="input" />
            </FormField>
            <FormField label="Email">
              <input type="email" {...register('email')} className="input" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <input {...register('phone')} className="input" />
            </FormField>
            <FormField label="Country">
              <input {...register('country')} defaultValue="Ghana" className="input" />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea rows={2} {...register('address')} className="input" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tax ID">
              <input {...register('tax_id')} className="input" />
            </FormField>
            <FormField label="Type">
              <select {...register('is_international')} className="input">
                <option value="false">Local</option>
                <option value="true">International</option>
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}