import { useQuery } from '@tanstack/react-query';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

export default function Payroll() {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => hrApi.payrollCycles.list({ page_size: 100 }),
  });

  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'payslips',
      label: 'Payslips',
      render: (r) => r.payslips?.length || 0,
    },
  ];

  return (
    <div className="card">
      <DataTable
        columns={columns}
        data={data?.results}
        loading={isLoading}
        emptyMessage="No payroll cycles"
      />
    </div>
  );
}