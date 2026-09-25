import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { productionApi } from '../../api/production';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatDate } from '../../utils/formatters';

export default function QCReports() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['qcreports'],
    queryFn: () => productionApi.qcReports.list({ page_size: 100 }),
  });

  const { data: mfgOrders } = useQuery({
    queryKey: ['mfgorders-for-qc'],
    queryFn: () => productionApi.manufacturingOrders.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (fd) => productionApi.qcReports.create(fd),
    onSuccess: () => {
      toast.success('QC report created');
      qc.invalidateQueries({ queryKey: ['qcreports'] });
      setModal(false);
      reset();
    },
  });

  const onSubmit = (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k === 'report_file') {
        if (v?.[0]) fd.append(k, v[0]);
      } else if (v !== undefined && v !== '') {
        fd.append(k, v);
      }
    });
    fd.append('passed', values.passed || 'false');
    fd.append('rework_required', values.rework_required || 'false');
    create.mutate(fd);
  };

  const columns = [
    {
      key: 'report_no',
      label: 'Report No.',
      render: (r) => <span className="font-medium text-blue-700">{r.report_no}</span>,
    },
    { key: 'stage', label: 'Stage' },
    {
      key: 'passed',
      label: 'Result',
      render: (r) =>
        r.passed ? (
          <span className="text-green-600 font-semibold text-sm">PASS</span>
        ) : (
          <span className="text-red-600 font-semibold text-sm">FAIL</span>
        ),
    },
    {
      key: 'rework_required',
      label: 'Rework',
      render: (r) => (r.rework_required ? 'Yes' : 'No'),
    },
    { key: 'timestamp', label: 'Date', render: (r) => formatDate(r.timestamp) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New QC Report
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No QC reports"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New QC Report">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Manufacturing Order" required>
            <select
              {...register('manufacturing_order', { required: true })}
              className="input"
            >
              <option value="">— Select —</option>
              {mfgOrders?.results?.map((mo) => (
                <option key={mo.id} value={mo.id}>
                  {mo.order_no}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Stage" required>
            <select {...register('stage', { required: true })} className="input">
              <option value="ASSEMBLY">Assembly</option>
              <option value="TESTING">Testing</option>
              <option value="FINISHING">Finishing/Rework</option>
              <option value="FINAL_QC">Final QC</option>
            </select>
          </FormField>
          <FormField label="Findings">
            <textarea rows={3} {...register('findings')} className="input" />
          </FormField>
          <FormField label="Report File">
            <input type="file" {...register('report_file')} className="input" />
          </FormField>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('passed')} /> Passed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('rework_required')} /> Rework Required
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
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