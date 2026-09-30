import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Filter } from 'lucide-react';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import { formatCurrency, formatDate } from '../../utils/formatters';

const DIR_STYLES = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  INTERNAL: 'bg-blue-100 text-blue-800',
};

export default function StockMovements() {
  const [direction, setDirection] = useState('');
  const [movementType, setMovementType] = useState('');

  const params = { page_size: 100 };
  if (direction) params.direction = direction;
  if (movementType) params.movement_type = movementType;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', direction, movementType],
    queryFn: () => procurementApi.stockMovements.list(params),
  });

  const columns = [
    {
      key: 'movement_no',
      label: 'Ref',
      render: (r) => <span className="font-mono text-xs text-blue-700">{r.movement_no}</span>,
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (r) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${DIR_STYLES[r.direction] || 'bg-slate-100 text-slate-700'}`}>
          {r.direction === 'IN' && <ArrowDownToLine className="w-3 h-3" />}
          {r.direction === 'OUT' && <ArrowUpFromLine className="w-3 h-3" />}
          {r.direction === 'INTERNAL' && <ArrowLeftRight className="w-3 h-3" />}
          {r.direction}
        </span>
      ),
    },
    { key: 'movement_type_display', label: 'Type' },
    {
      key: 'item_part_number',
      label: 'Item',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.item_part_number}</p>
          <p className="text-xs text-slate-500 truncate max-w-xs">{r.item_description}</p>
        </div>
      ),
    },
    { key: 'branch_name', label: 'Branch' },
    {
      key: 'quantity',
      label: 'Qty',
      className: 'text-right',
      render: (r) => <span className="font-medium">{r.quantity}</span>,
    },
    {
      key: 'unit_cost',
      label: 'Unit Cost',
      className: 'text-right',
      render: (r) => formatCurrency(r.unit_cost),
    },
    {
      key: 'total_cost',
      label: 'Total',
      className: 'text-right',
      render: (r) => <span className="font-medium">{formatCurrency(r.total_cost)}</span>,
    },
    {
      key: 'counterparty_type',
      label: 'Counterparty',
      render: (r) => {
        const name = r.supplier_name || r.client_po_no || r.po_no || r.counterparty_type;
        return <span className="text-xs text-slate-600">{name}</span>;
      },
    },
    {
      key: 'performed_at',
      label: 'Date',
      render: (r) => formatDate(r.performed_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="input !py-1.5 !text-sm w-40"
          >
            <option value="">All directions</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="INTERNAL">INTERNAL</option>
          </select>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="input !py-1.5 !text-sm w-64"
          >
            <option value="">All types</option>
            <option value="RECEIPT">Receipt from Supplier</option>
            <option value="ISSUE">Issue to Requisition</option>
            <option value="SALE">Sale to Client</option>
            <option value="CLIENT_RETURN">Return from Client</option>
            <option value="SUPPLIER_RETURN">Return to Supplier</option>
            <option value="REJECTION_PURCHASE">Rejected on Receipt</option>
            <option value="REJECTION_SALE">Rejected by Client</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No stock movements yet"
          emptyMessage="Movements appear here as you receive, issue, transfer, and return stock."
          emptyIcon={ArrowLeftRight}
        />
      </div>
    </div>
  );
}