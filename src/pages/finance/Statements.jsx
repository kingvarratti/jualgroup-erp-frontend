import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Download, Send, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../api/finance';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import ExportMenu from '../../components/ExportMenu';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Statements() {
  const qc = useQueryClient();
  const [generateModal, setGenerateModal] = useState(false);
  const [submitModal, setSubmitModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['soas'],
    queryFn: () => financeApi.soa.list({ page_size: 100 }),
  });

  const columns = [
    {
      key: 'soa_no',
      label: 'SOA No.',
      render: (r) => <span className="font-medium text-blue-700">{r.soa_no}</span>,
    },
    { key: 'client_name', label: 'Client' },
    {
      key: 'period_start',
      label: 'Period',
      render: (r) => `${formatDate(r.period_start)} → ${formatDate(r.period_end)}`,
    },
    {
      key: 'opening_balance',
      label: 'Opening',
      className: 'text-right',
      render: (r) => formatCurrency(r.opening_balance, r.currency),
    },
    {
      key: 'total_debits',
      label: 'Debits',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_debits, r.currency),
    },
    {
      key: 'total_credits',
      label: 'Credits',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_credits, r.currency),
    },
    {
      key: 'closing_balance',
      label: 'Closing',
      className: 'text-right',
      render: (r) => (
        <span className="font-semibold text-blue-700">
          {formatCurrency(r.closing_balance, r.currency)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">
          {data?.count || 0} statement{(data?.count || 0) === 1 ? '' : 's'} generated
        </span>
        <div className="flex items-center gap-2">
          <ExportMenu
            columns={columns}
            data={data?.results || []}
            filename={`statements-${new Date().toISOString().slice(0, 10)}`}
            title="Statements of Account"
          />
          <button
            className="btn-primary"
            onClick={() => setGenerateModal(true)}
          >
            <Plus className="w-4 h-4" /> Generate SOA
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No statements yet"
          emptyMessage="Generate a statement to see a client's account summary."
          emptyIcon={FileText}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => financeApi.soa.pdf(r.id, `${r.soa_no}.pdf`)}
                className="btn-ghost !p-2 text-slate-600"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSubmitModal(r)}
                className="btn-ghost !p-2 text-blue-600"
                title="Mark as Submitted"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <GenerateSOAModal
        open={generateModal}
        onClose={() => setGenerateModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['soas'] });
          setGenerateModal(false);
        }}
      />

      <SubmitSOAModal
        soa={submitModal}
        onClose={() => setSubmitModal(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['soas'] });
          setSubmitModal(null);
        }}
      />
    </div>
  );
}


function GenerateSOAModal({ open, onClose, onSuccess }) {
  const [clientName, setClientName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [currency, setCurrency] = useState('GHS');

  const { data: clients } = useQuery({
    queryKey: ['soa-clients'],
    queryFn: () => financeApi.soa.clients(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (payload) => financeApi.soa.generate(payload),
    onSuccess: () => {
      toast.success('SOA generated');
      setClientName('');
      setPeriodStart('');
      setPeriodEnd('');
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Generation failed');
    },
  });

  const handleSubmit = () => {
    if (!clientName || !periodStart || !periodEnd) {
      toast.error('All fields are required');
      return;
    }
    mutation.mutate({
      client_name: clientName,
      period_start: periodStart,
      period_end: periodEnd,
      currency,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Statement of Account" size="md">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Auto-Generated Statement</p>
          <p className="text-blue-700 mt-1">
            The system will scan all invoices and payments for this client within the period and compute the balance automatically.
          </p>
        </div>
      </div>

      <FormField label="Client Name" required>
        <input
          list="soa-clients-list"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="input"
          placeholder="Start typing..."
        />
        <datalist id="soa-clients-list">
          {clients?.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Period Start" required>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="input"
          />
        </FormField>
        <FormField label="Period End" required>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="input"
          />
        </FormField>
      </div>

      <FormField label="Currency">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
          <option value="GHS">GHS</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </FormField>

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Generating...' : 'Generate SOA'}
        </button>
      </div>
    </Modal>
  );
}


function SubmitSOAModal({ soa, onClose, onSuccess }) {
  const [submittedTo, setSubmittedTo] = useState('');
  const [method, setMethod] = useState('EMAIL');

  const mutation = useMutation({
    mutationFn: (payload) => financeApi.soaSubmissions.create(payload),
    onSuccess: () => {
      toast.success('Submission recorded');
      setSubmittedTo('');
      onSuccess();
    },
    onError: () => toast.error('Failed to record submission'),
  });

  if (!soa) return null;

  return (
    <Modal open={!!soa} onClose={onClose} title={`Submit SOA — ${soa.soa_no}`} size="sm">
      <FormField label="Submitted To" required>
        <input
          value={submittedTo}
          onChange={(e) => setSubmittedTo(e.target.value)}
          className="input"
          placeholder="e.g. client@company.com"
        />
      </FormField>
      <FormField label="Submission Method">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
          <option value="EMAIL">Email</option>
          <option value="PRINT">Print & Hand Deliver</option>
          <option value="COURIER">Courier</option>
          <option value="PORTAL">Client Portal</option>
        </select>
      </FormField>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button
          onClick={() =>
            mutation.mutate({
              soa: soa.id,
              submitted_to: submittedTo.trim(),
              submission_method: method,
            })
          }
          disabled={mutation.isPending || !submittedTo.trim()}
          className="btn-primary"
        >
          {mutation.isPending ? 'Saving...' : 'Record Submission'}
        </button>
      </div>
    </Modal>
  );
}