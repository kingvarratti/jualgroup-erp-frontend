import InventoryReports from './pages/procurement/InventoryReports';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Sales
import Enquiries from './pages/sales/Enquiries';
import EnquiryDetail from './pages/sales/EnquiryDetail';
import Quotations from './pages/sales/Quotations';
import QuotationDetail from './pages/sales/QuotationDetail';
import ClientPOs from './pages/sales/ClientPOs';

// Procurement
import Inventory from './pages/procurement/Inventory';
import StockRequisitions from './pages/procurement/StockRequisitions';
import Suppliers from './pages/procurement/Suppliers';
import PurchaseOrders from './pages/procurement/PurchaseOrders';
import SupplyChainQueue from './pages/procurement/SupplyChainQueue';

// Production
import ManufacturingOrders from './pages/production/ManufacturingOrders';
import MaterialRequisitions from './pages/production/MaterialRequisitions';
import QCReports from './pages/production/QCReports';

// Finance
import Invoices from './pages/finance/Invoices';
import Payments from './pages/finance/Payments';
import PaymentVouchers from './pages/finance/PaymentVouchers';
import GeneralLedger from './pages/finance/GeneralLedger';
import Dispatches from './pages/finance/Dispatches';
import Statements from './pages/finance/Statements';
    
// HR
import Leaves from './pages/hr/Leaves';
import Payroll from './pages/hr/Payroll';
import ExitProcesses from './pages/hr/ExitProcesses';

// Admin
import Approvals from './pages/admin/Approvals';
import Users from './pages/admin/Users';
import Branches from './pages/admin/Branches';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="approvals" element={<Approvals />} />

        {/* Sales */}
        <Route path="sales/enquiries" element={<Enquiries />} />
        <Route path="sales/enquiries/:id" element={<EnquiryDetail />} />
        <Route path="sales/quotations" element={<Quotations />} />
        <Route path="sales/quotations/:id" element={<QuotationDetail />} />
        <Route path="sales/client-pos" element={<ClientPOs />} />

        {/* Procurement */}
      
        <Route path="procurement/inventory" element={<Inventory />} />
        <Route path="procurement/inventory-reports" element={<InventoryReports />} />
        <Route path="procurement/stock-requisitions" element={<StockRequisitions />} />
        <Route path="procurement/suppliers" element={<Suppliers />} />
        <Route path="procurement/purchase-orders" element={<PurchaseOrders />} />
        <Route path="procurement/sourcing" element={<SupplyChainQueue />} />
        

        {/* Production */}
        <Route path="production/orders" element={<ManufacturingOrders />} />
        <Route path="production/material-requisitions" element={<MaterialRequisitions />} />
        <Route path="production/qc" element={<QCReports />} />

        {/* Finance */}
        <Route path="finance/invoices" element={<Invoices />} />
        <Route path="finance/payments" element={<Payments />} />
        <Route path="finance/vouchers" element={<PaymentVouchers />} />
        <Route path="finance/ledger" element={<GeneralLedger />} />
        <Route path="finance/dispatches" element={<Dispatches />} />
        <Route path="finance/statements" element={<Statements />} />


        {/* HR */}
        <Route path="hr/leaves" element={<Leaves />} />
        <Route path="hr/payroll" element={<Payroll />} />
        <Route path="hr/exits" element={<ExitProcesses />} />

        {/* Admin */}
        <Route path="admin/users" element={<Users />} />
        <Route path="admin/branches" element={<Branches />} />

        <Route
          path="*"
          element={<div className="text-center py-12 text-slate-500">Page not found</div>}
        />
      </Route>
    </Routes>
  );
}