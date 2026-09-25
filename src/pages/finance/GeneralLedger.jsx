import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function GeneralLedger() {
  const { data, isLoading } = useQuery({
    queryKey: ['gl'],
    queryFn: () => financeApi.generalLedger.list({ page_size: 100 }),
  });

  const columns = [
    { key: 'entry_date', label: 'Date', render: (r) => formatDate(r.entry_date) },
    { key: 'account_code', label: 'Code' },
    { key: 'account_name', label: 'Account' },
    { key: 'description', label: 'Description' },
    {
      key: 'debit',
      label: 'Debit',
      render: (r) => (Number(r.debit) > 0 ? formatCurrency(r.debit) : '—'),
    },
    {
      key: 'credit',
      label: 'Credit',
      render: (r) => (Number(r.credit) > 0 ? formatCurrency(r.credit) : '—'),
    },
    { key: 'reference', label: 'Reference' },
  ];

  return (
    <div className="card">
      <DataTable
        columns={columns}
        data={data?.results}
        loading={isLoading}
        emptyMessage="No ledger entries"
      />
    </div>
  );
}