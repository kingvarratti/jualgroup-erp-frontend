import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const TITLES = {
  '/': 'Dashboard',
  '/approvals': 'Approval Queue',
  '/sales/enquiries': 'Enquiries',
  '/sales/quotations': 'Quotations',
  '/sales/client-pos': 'Client Purchase Orders',
  '/procurement/inventory': 'Inventory',
  '/procurement/stock-requisitions': 'Stock Requisitions',
  '/procurement/suppliers': 'Suppliers',
  '/procurement/rfqs': 'Supplier RFQs',
  '/procurement/purchase-orders': 'Purchase Orders',
  '/production/orders': 'Manufacturing Orders',
  '/production/material-requisitions': 'Material Requisitions',
  '/production/qc': 'Quality Control',
  '/finance/invoices': 'Invoices',
  '/finance/payments': 'Client Payments',
  '/finance/vouchers': 'Payment Vouchers',
  '/finance/ledger': 'General Ledger',
  '/finance/dispatches': 'Dispatches',
  '/hr/leaves': 'Leave Management',
  '/hr/payroll': 'Payroll',
  '/hr/exits': 'Exit Processes',
  '/admin/users': 'User Management',
  '/admin/branches': 'Branches',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = TITLES[location.pathname] || 'JualGroup ERP';

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}