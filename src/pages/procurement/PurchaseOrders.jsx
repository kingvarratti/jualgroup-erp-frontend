import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Send, ShoppingCart, Download, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import GRNModal from '../../components/GRNModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [receivePO, setReceivePO] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos', status],
    queryFn: () => procurementApi.purchaseOrders.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const approve = useMutation({
    mutationFn: (id) => procurementApi.purchaseOrders.custom(id, 'approve'),
    onSuccess: () => {
      toast.success('PO approved');
      qc.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const send = useMutation({
    mutationFn: (id) =>
      procurementApi.purchaseOrders.custom(id, 'send_to_supplier'),
    onSuccess: () => {
      toast.success('Sent to supplier');
      qc.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const isFinance = [ROLES.FINANCE, ROLES.ADMIN].includes(user?.role);
  const isSupplyChain = [ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'po_no',
      label: 'PO No.',
      render: (r) => <span className="font-medium text-blue-700">{r.po_no}</span>,
    },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'client_po_no', label: 'Client PO' },
    {
      key: 'total_cost',
      label: 'Amount',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_cost, r.currency),
    },
    {
      key: 'expected_delivery',
      label: 'Expected',
      render: (r) => formatDate(r.expected_delivery),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-64"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_PROFITABILITY">Pending Profitability</option>
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent to Supplier</option>
          <option value="RECEIVED">Received</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No purchase orders"
          emptyMessage="Purchase orders are raised from suppliers to fulfill client POs."
          emptyIcon={ShoppingCart}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() =>
                  procurementApi.purchaseOrders.pdf(r.id, `${r.po_no}.pdf`)
                }
                className="btn-ghost !p-2 text-slate-600"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              {isFinance && r.status === 'PENDING_PROFITABILITY' && (
                <button
                  onClick={() => approve.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {isSupplyChain && r.status === 'APPROVED' && (
                <button
                  onClick={() => send.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="Send to Supplier"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              {(isSupplyChain || isFinance) &&
                ['SENT', 'APPROVED'].includes(r.status) && (
                  <button
                    onClick={() => setReceivePO(r)}
                    className="btn-ghost !p-2 text-emerald-600"
                    title="Receive Goods"
                  >
                    <PackageCheck className="w-4 h-4" />
                  </button>
                )}
            </div>
          )}
        />
      </div>

      <GRNModal po={receivePO} onClose={() => setReceivePO(null)} />
    </div>
  );
}