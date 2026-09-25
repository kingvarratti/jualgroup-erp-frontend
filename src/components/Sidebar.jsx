import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ShoppingCart, Factory,
  Wallet, LogOut, Building2, Send, DollarSign, CheckSquare,
  Package, Truck, ClipboardList, BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/rolePermissions';

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/approvals', label: 'Approvals', icon: CheckSquare, module: 'approvals' },
    ],
  },
  {
    section: 'Sales',
    items: [
      { to: '/sales/enquiries', label: 'Enquiries', icon: FileText, module: 'sales' },
      { to: '/sales/quotations', label: 'Quotations', icon: Send, module: 'sales' },
      { to: '/sales/client-pos', label: 'Client POs', icon: ClipboardList, module: 'sales' },
    ],
  },
  {
    section: 'Warehouse',
    items: [
      { to: '/procurement/inventory', label: 'Inventory', icon: Package, module: 'stores' },
      { to: '/procurement/stock-requisitions', label: 'Stock Requisitions', icon: ClipboardList, module: 'stores' },
    ],
  },
  {
    section: 'Supply Chain',
    items: [
      { to: '/procurement/suppliers', label: 'Suppliers', icon: Building2, module: 'supply_chain' },
      { to: '/procurement/rfqs', label: 'RFQs', icon: Send, module: 'supply_chain' },
      { to: '/procurement/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, module: 'supply_chain' },
    ],
  },
  {
    section: 'Production',
    items: [
      { to: '/production/orders', label: 'Manufacturing Orders', icon: Factory, module: 'production' },
      { to: '/production/material-requisitions', label: 'Material Requisitions', icon: ClipboardList, module: 'production' },
      { to: '/production/qc', label: 'QC Reports', icon: CheckSquare, module: 'qc' },
    ],
  },
  {
    section: 'Accountant',
    items: [
      { to: '/finance/payments', label: 'Payments', icon: DollarSign, module: 'accountant' },
      { to: '/finance/vouchers', label: 'Payment Vouchers', icon: Wallet, module: 'accountant' },
      { to: '/finance/ledger', label: 'General Ledger', icon: BarChart3, module: 'accountant' },
    ],
  },
  {
    section: 'Accounts',
    items: [
      { to: '/finance/invoices', label: 'Invoices', icon: FileText, module: 'accounts' },
      { to: '/finance/dispatches', label: 'Dispatch', icon: Truck, module: 'logistics' },
    ],
  },
  {
    section: 'Human Resources',
    items: [
      { to: '/hr/leaves', label: 'Leave Management', icon: ClipboardList, module: 'hr' },
      { to: '/hr/payroll', label: 'Payroll', icon: DollarSign, module: 'hr' },
      { to: '/hr/exits', label: 'Exit Processes', icon: LogOut, module: 'hr' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users, module: 'admin' },
      { to: '/admin/branches', label: 'Branches', icon: Building2, module: 'admin' },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
            JG
          </div>
          <div>
            <p className="text-white font-semibold text-sm">JualGroup</p>
            <p className="text-xs text-slate-500">ERP System</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map((section) => {
            const visible = section.items.filter(
              (i) => !i.module || canAccess(user, i.module)
            );
            if (!visible.length) return null;

            return (
              <div key={section.section} className="mb-4">
                <p className="px-5 text-xs uppercase tracking-wider text-slate-500 mb-2">
                  {section.section}
                </p>
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-5 py-2 text-sm hover:bg-slate-800 transition ${
                        isActive ? 'bg-slate-800 text-white border-l-2 border-blue-500' : ''
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.role_display}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}