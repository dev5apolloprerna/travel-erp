import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';

import CustomerList from './pages/retail/CustomerList';
import CustomerForm from './pages/retail/CustomerForm';
import OrderList from './pages/retail/OrderList';
import BookingFlow from './pages/retail/BookingFlow';
import OrderDetail from './pages/retail/OrderDetail';

import CompanyList from './pages/b2b/CompanyList';
import CompanyForm from './pages/b2b/CompanyForm';
import CompanyDetail from './pages/b2b/CompanyDetail';

import FitDashboard from './pages/fit/FitDashboard';
import DoctorList from './pages/fit/DoctorList';
import FitEmployeeList from './pages/fit/FitEmployeeList';

import ClusterMaster from './pages/masters/ClusterMaster';
import DivisionMaster from './pages/masters/DivisionMaster';
import GradeMaster from './pages/masters/GradeMaster';
import DepartmentMaster from './pages/masters/DepartmentMaster';
import ServiceMaster from './pages/masters/ServiceMaster';

import EmployeeListAdmin from './pages/admin/EmployeeList';
import EmployeeForm from './pages/admin/EmployeeForm';

import HolidayMaster from './pages/hr/HolidayMaster';
import MyLeave from './pages/hr/MyLeave';
import LeaveRequests from './pages/hr/LeaveRequests';
import SalarySlips from './pages/hr/SalarySlips';
import MySalarySlips from './pages/hr/MySalarySlips';

import CompanyProfile from './pages/settings/CompanyProfile';
import ChangePassword from './pages/account/ChangePassword';
import MyProfile from './pages/account/MyProfile';

import CategoryMaster from './pages/cms/CategoryMaster';
import DestinationMaster from './pages/cms/DestinationMaster';
import PackageMaster from './pages/cms/PackageMaster';
import ContentMaster from './pages/cms/ContentMaster';
import WebsiteBookings from './pages/cms/WebsiteBookings';
import InvoiceGenerate from './pages/invoice/InvoiceGenerate';

import B2BBookingFlow from './pages/b2b/BookingFlow';
import FitBookingFlow from './pages/fit/BookingFlow';
import FitOrderList from './pages/fit/FitOrderList';

import CustomerPortal from './pages/portal/CustomerPortal';
import MemberPortal from './pages/portal/MemberPortal';

import OwnerLayout from './pages/owner/OwnerLayout';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MasterList from './pages/owner/MasterList';
import MasterForm from './pages/owner/MasterForm';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-ink-muted">Loading…</div>;
  if (!user) return <Navigate to="/login/employee" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login/employee" replace />;
  return children;
}

const STAFF = ['EMPLOYEE', 'SUPER_ADMIN'];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login/employee" replace />} />
      <Route path="/login/:portal" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route path="/app" element={<Protected roles={STAFF}><AppLayout /></Protected>}>
        <Route index element={<EmployeeDashboard />} />

        {/* Retail */}
        <Route path="retail/customers" element={<CustomerList />} />
        <Route path="retail/customers/new" element={<CustomerForm />} />
        <Route path="retail/customers/:id/edit" element={<CustomerForm />} />
        <Route path="retail/orders" element={<OrderList />} />
        <Route path="retail/orders/new" element={<BookingFlow />} />
        <Route path="retail/orders/:id" element={<OrderDetail />} />

        {/* B2B */}
        <Route path="b2b/companies" element={<CompanyList />} />
        <Route path="b2b/companies/new" element={<CompanyForm />} />
        <Route path="b2b/companies/:id" element={<CompanyDetail />} />
        <Route path="b2b/orders/new" element={<B2BBookingFlow />} />

        {/* FIT */}
        <Route path="fit" element={<FitDashboard />} />
        <Route path="fit/doctors" element={<DoctorList />} />
        <Route path="fit/employees" element={<FitEmployeeList />} />
        <Route path="fit/orders" element={<FitOrderList />} />
        <Route path="fit/orders/new" element={<FitBookingFlow />} />

        {/* Masters (separate pages) */}
        <Route path="masters/clusters" element={<ClusterMaster />} />
        <Route path="masters/divisions" element={<DivisionMaster />} />
        <Route path="masters/grades" element={<GradeMaster />} />
        <Route path="masters/departments" element={<DepartmentMaster />} />
        <Route path="masters/services" element={<ServiceMaster />} />

        {/* HR */}
        <Route path="hr/holidays" element={<HolidayMaster />} />
        <Route path="hr/leaves" element={<LeaveRequests />} />
        <Route path="hr/my-leave" element={<MyLeave />} />
        <Route path="hr/salary-slips" element={<SalarySlips />} />
        <Route path="hr/my-salary-slips" element={<MySalarySlips />} />

        {/* Account */}
        <Route path="account/password" element={<ChangePassword />} />
        <Route path="account/profile" element={<MyProfile />} />

        {/* Administration */}
        {/* Website / CMS */}
        <Route path="cms/categories" element={<CategoryMaster />} />
        <Route path="cms/destinations" element={<DestinationMaster />} />
        <Route path="cms/packages" element={<PackageMaster />} />
        <Route path="cms/content" element={<ContentMaster />} />
        <Route path="cms/bookings" element={<WebsiteBookings />} />

        {/* Invoice generation — shared by all three modules */}
        <Route path="invoices/:orderId/generate" element={<InvoiceGenerate />} />

        <Route path="settings/company" element={<CompanyProfile />} />
        <Route path="admin/employees" element={<EmployeeListAdmin />} />
        <Route path="admin/employees/new" element={<EmployeeForm />} />
        <Route path="admin/employees/:id" element={<EmployeeForm />} />
      </Route>

      <Route path="/portal/customer" element={<Protected roles={['RETAIL_CUSTOMER']}><CustomerPortal /></Protected>} />
      <Route path="/portal/member" element={<Protected roles={['B2B_MEMBER']}><MemberPortal /></Protected>} />

      {/* Company Owner area — masters. Guarded to COMPANY_OWNER only. */}
      <Route path="/owner" element={<Protected roles={['COMPANY_OWNER']}><OwnerLayout /></Protected>}>
        <Route index element={<OwnerDashboard />} />
        <Route path=":key" element={<MasterList />} />
        <Route path=":key/create" element={<MasterForm />} />
        <Route path=":key/:id/edit" element={<MasterForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/login/employee" replace />} />
    </Routes>
  );
}
