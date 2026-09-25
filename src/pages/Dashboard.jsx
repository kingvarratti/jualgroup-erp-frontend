import { useQuery } from '@tanstack/react-query';
import {
  FileText, ShoppingCart, Factory, Wallet, CheckSquare, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { salesApi } from '../api/sales';
import { productionApi } from '../api/production';
import { financeApi } from '../api/finance';
import { coreApi } from '../api/core';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: enquiries } = useQuery({
    queryKey: ['dash-enquiries'],
    queryFn: () => salesApi.enquiries.list({ page_size: 1 }),
  });

  const { data: quotations } = useQuery({
    queryKey: ['dash-quotations'],
    queryFn: () => salesApi.quotations.list({ page_size: 1 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['dash-clientpos'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 5 }),
  });

  const { data: mfgOrders } = useQuery({
    queryKey: ['dash-mfg'],
    queryFn: () => productionApi.manufacturingOrders.list({ page_size: 1 }),
  });

  const { data: invoices } = useQuery({
    queryKey: ['dash-invoices'],
    queryFn: () => financeApi.invoices.list({ page_size: 1 }),
  });

  const { data: approvals } = useQuery({
    queryKey: ['dash-approvals'],
    queryFn: () => coreApi.approvals.list({ status: 'PENDING', page_size: 5 }),
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold">
          Welcome back, {user?.first_name || user?.username} 👋
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          You're logged in as <span className="font-medium">{user?.role_display}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Enquiries"
          value={enquiries?.count ?? '—'}
          icon={FileText}
          color="brand"
        />
        <StatCard
          label="Quotations"
          value={quotations?.count ?? '—'}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Manufacturing"
          value={mfgOrders?.count ?? '—'}
          icon={Factory}
          color="amber"
        />
        <StatCard
          label="Invoices"
          value={invoices?.count ?? '—'}
          icon={Wallet}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" /> Pending Approvals
            </h3>
            <span className="text-xs text-slate-500">{approvals?.count ?? 0} total</span>
          </div>
          <div className="card-body space-y-2">
            {approvals?.results?.length ? (
              approvals.results.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.module.replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">No pending approvals 🎉</p>
                <p className="text-xs text-slate-400 mt-1">You're all caught up</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" /> Recent Client POs
            </h3>
          </div>
          <div className="card-body space-y-2">
            {clientPOs?.results?.length ? (
              clientPOs.results.map((po) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{po.internal_order_no}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {formatCurrency(po.total_value)}
                    </p>
                  </div>
                  <StatusBadge status={po.status} />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">No client POs yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  They'll appear once Sales closes a deal
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}