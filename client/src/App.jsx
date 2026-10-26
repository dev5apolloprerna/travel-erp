import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ImpersonationBanner from './components/ImpersonationBanner';

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
import CompanyOwnerList from './pages/admin/CompanyOwnerList';
import CompanyOwnerForm from './pages/admin/CompanyOwnerForm';

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
import OtherPages from './pages/cms/OtherPages';
import InquiryList from './pages/cms/InquiryList';
import InvoiceGenerate from './pages/invoice/InvoiceGenerate';

import B2BBookingFlow from './pages/b2b/BookingFlow';
import FitBookingFlow from './pages/fit/BookingFlow';
import FitOrderList from './pages/fit/FitOrderList';

import CustomerPortal from './pages/portal/CustomerPortal';
import MemberPortal from './pages/portal/MemberPortal';

import MainCompanies from './pages/org/MainCompanies';
import SupplierInvoices from './pages/org/SupplierInvoices';
import CreditNotes from './pages/invoice/CreditNotes';
import ActivityLogs from './pages/admin/ActivityLogs';
import ReportsHub from './pages/reports/ReportsHub';
import ReportView from './pages/reports/ReportView';

import OwnerLayout from './pages/owner/OwnerLayout';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MasterList from './pages/owner/MasterList';
import MasterForm from './pages/owner/MasterForm';
// Dedicated tabbed master forms (Account / Contact / Hotel) — reqs #3/#4/#5.
import AccountForm from './pages/owner/forms/AccountForm';
import ContactForm from './pages/owner/forms/ContactForm';
import HotelForm from './pages/owner/forms/HotelForm';

// Where each role's "home" is, so an authenticated user who hits a page they
// aren't allowed to see is sent back to their own area — never to the login
// screen (that looked like a forced logout when a Company Owner / Super Admin
// opened the Master menu; see requirement #4).
const HOME_FOR = {
  SUPER_ADMIN: '/app', EMPLOYEE: '/app', COMPANY_OWNER: '/owner',
  RETAIL_CUSTOMER: '/portal/customer', B2B_MEMBER: '/portal/member',
};

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-ink-muted">Loading…</div>;
  // Not authenticated at all -> the login screen is correct.
  if (!user) return <Navigate to="/login/employee" replace />;
  // Authenticated but not allowed here -> keep the session, bounce to their own
  // home instead of logging them out.
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_FOR[user.role] || '/app'} replace />;
  }
  return children;
}

// The /app shell is the Super Admin / Employee workspace. The Company Owner has its
// own self-contained shell at /owner (same feature pages, mounted there), so it is no
// longer sent into /app — that is what made it look like "redirected to Super Admin"
// with all the admin menus showing.
const STAFF = ['EMPLOYEE', 'SUPER_ADMIN'];
// The Company Owner master + operations area; Super Admin may also enter it (admin access).
const OWNER_AREA = ['COMPANY_OWNER', 'SUPER_ADMIN'];

// Gate a page inside the /app shell to Super Admin only (keeps the session; bounces others home).
function SAOnly({ children }) {
  const { user } = useAuth();
  if (user && user.role !== 'SUPER_ADMIN') return <Navigate to={HOME_FOR[user.role] || '/app'} replace />;
  return children;
}

export default function App() {
  return (
    <>
    <ImpersonationBanner />
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
        <Route path="retail/orders/:id/edit" element={<BookingFlow />} />
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
        <Route path="cms/other-pages" element={<OtherPages />} />
        <Route path="cms/inquiries" element={<InquiryList />} />

        {/* Invoice generation — shared by all three modules */}
        <Route path="invoices/:orderId/generate" element={<InvoiceGenerate />} />

        <Route path="settings/company" element={<CompanyProfile />} />
        <Route path="admin/employees" element={<EmployeeListAdmin />} />
        <Route path="org/main-companies" element={<MainCompanies />} />
        <Route path="org/supplier-invoices" element={<SupplierInvoices />} />
        <Route path="invoices/credit-notes" element={<CreditNotes />} />
        <Route path="activity-logs" element={<ActivityLogs />} />

        {/* Reports module (v60) — Super Admin only. See menuConfig/reportRoutes
            for the future per-user-rights extension point. */}
        <Route path="reports" element={<SAOnly><ReportsHub /></SAOnly>} />
        <Route path="reports/:id" element={<SAOnly><ReportView /></SAOnly>} />

        <Route path="admin/employees/new" element={<EmployeeForm />} />
        <Route path="admin/employees/:id" element={<EmployeeForm />} />
        {/* Company Owner account management — Super Admin only (req #3) */}
        <Route path="admin/company-owners" element={<SAOnly><CompanyOwnerList /></SAOnly>} />
        <Route path="admin/company-owners/new" element={<SAOnly><CompanyOwnerForm /></SAOnly>} />
        <Route path="admin/company-owners/:id" element={<SAOnly><CompanyOwnerForm /></SAOnly>} />
      </Route>

      <Route path="/portal/customer" element={<Protected roles={['RETAIL_CUSTOMER']}><CustomerPortal /></Protected>} />
      <Route path="/portal/member" element={<Protected roles={['B2B_MEMBER']}><MemberPortal /></Protected>} />

      {/* Company Owner master area — Company Owner + Super Admin (administrative access). */}
      <Route path="/owner" element={<Protected roles={OWNER_AREA}><OwnerLayout /></Protected>}>
        <Route index element={<OwnerDashboard />} />
        {/* Main Companies / Supplier Invoices are 360/Super-Admin functions — not mounted here (req #4/#6). */}

        {/* Operations the Company Owner runs inside its own shell — the SAME components
            used under /app, made shell-aware so their nav stays in /owner (req: keep the
            Company Owner inside its login, not the Super Admin workspace). */}
        <Route path="retail/customers" element={<CustomerList />} />
        <Route path="retail/customers/new" element={<CustomerForm />} />
        <Route path="retail/customers/:id/edit" element={<CustomerForm />} />
        <Route path="retail/orders" element={<OrderList />} />
        <Route path="retail/orders/new" element={<BookingFlow />} />
        <Route path="retail/orders/:id/edit" element={<BookingFlow />} />
        <Route path="retail/orders/:id" element={<OrderDetail />} />
        <Route path="b2b/companies" element={<CompanyList />} />
        <Route path="b2b/companies/new" element={<CompanyForm />} />
        <Route path="b2b/companies/:id" element={<CompanyDetail />} />
        <Route path="b2b/orders/new" element={<B2BBookingFlow />} />
        <Route path="admin/employees" element={<EmployeeListAdmin />} />
        <Route path="admin/employees/new" element={<EmployeeForm />} />
        <Route path="admin/employees/:id" element={<EmployeeForm />} />
        <Route path="invoices/:orderId/generate" element={<InvoiceGenerate />} />

        {/* The old HR-only Employee master form is retired — the Company Owner uses the
            SAME login-User Employee form as the Super Admin (#1/#6). Redirect stale links. */}
        <Route path="employee" element={<Navigate to="/owner/admin/employees" replace />} />
        <Route path="employee/create" element={<Navigate to="/owner/admin/employees/new" replace />} />
        <Route path="employee/:id/edit" element={<Navigate to="/owner/admin/employees" replace />} />

        {/* Dedicated tabbed forms (static segments outrank the generic :key routes). */}
        <Route path="account/create" element={<AccountForm />} />
        <Route path="account/:id/edit" element={<AccountForm />} />
        <Route path="contactHead/create" element={<ContactForm />} />
        <Route path="contactHead/:id/edit" element={<ContactForm />} />
        <Route path="hotelHead/create" element={<HotelForm />} />
        <Route path="hotelHead/:id/edit" element={<HotelForm />} />

        <Route path=":key" element={<MasterList />} />
        <Route path=":key/create" element={<MasterForm />} />
        <Route path=":key/:id/edit" element={<MasterForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/login/employee" replace />} />
    </Routes>
    </>
  );
}
