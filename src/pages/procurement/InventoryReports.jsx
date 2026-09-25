import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, Package, Boxes, AlertTriangle,
  BarChart3, PieChart as PieIcon, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { procurementApi } from '../../api/procurement';
import StatCard from '../../components/StatCard';
import Loader from '../../components/Loader';
import { formatCurrency } from '../../utils/formatters';

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2',
  '#059669', '#ca8a04', '#dc2626', '#6366f1', '#14b8a6',
];

export default function InventoryReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-reports'],
    queryFn: () => procurementApi.inventory.reports(),
  });

  if (isLoading) return <Loader />;
  if (!data)
    return (
      <div className="text-center py-12 text-slate-500">No data available</div>
    );

  const { summary, by_category, top_value_items, top_low_stock, movements } = data;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={summary.total_items}
          icon={Boxes}
          color="brand"
          hint={`${summary.total_units.toFixed(0)} units on hand`}
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(summary.total_value)}
          icon={DollarSign}
          color="green"
          hint="At cost price"
        />
        <StatCard
          label="Avg Unit Cost"
          value={formatCurrency(summary.avg_unit_cost)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Categories"
          value={by_category.length}
          icon={Package}
          color="amber"
        />
      </div>

      {/* Bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Stock Value by Category
            </h3>
            <span className="text-xs text-slate-500">Top categories</span>
          </div>
          <div className="card-body">
            {by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={by_category}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No categories</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-600" /> Distribution
            </h3>
          </div>
          <div className="card-body">
            {by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={by_category}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {by_category.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No data</p>
            )}
          </div>
        </div>
      </div>

      {/* Movement Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Stock Movements
            (Last 6 Months)
          </h3>
          <span className="text-xs text-slate-500">In vs Out</span>
        </div>
        <div className="card-body">
          {movements && movements.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={movements} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="in"
                  stroke="#059669"
                  strokeWidth={2.5}
                  name="Stock In"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="out"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  name="Stock Out"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">
              No stock movements in the last 6 months.
            </p>
          )}
        </div>
      </div>

      {/* Top Value + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Top 10 Highest
              Value Items
            </h3>
          </div>
          <div className="card-body p-0">
            {top_value_items.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Part No.</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {top_value_items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 text-sm">
                            {item.part_number}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                      </td>
                      <td className="text-right text-slate-700">{item.quantity}</td>
                      <td className="text-right font-semibold text-blue-700">
                        {formatCurrency(item.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No items</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Top 10 Critical
              Low-Stock Items
            </h3>
            <span className="text-xs text-slate-500">Urgent reorder</span>
          </div>
          <div className="card-body p-0">
            {top_low_stock.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Part No.</th>
                    <th className="text-right">On Hand</th>
                    <th className="text-right">Reorder At</th>
                    <th className="text-right">Shortfall</th>
                  </tr>
                </thead>
                <tbody>
                  {top_low_stock.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 text-sm">
                            {item.part_number}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <span
                          className={
                            item.quantity <= 0
                              ? 'text-red-600 font-bold'
                              : 'text-amber-600 font-semibold'
                          }
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="text-right text-slate-600">
                        {item.reorder_level}
                      </td>
                      <td className="text-right font-semibold text-red-600">
                        -{item.shortfall}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">
                All items are well stocked 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}