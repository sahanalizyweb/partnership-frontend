import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { PortalLayout } from './layouts/PortalLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PartnersListPage } from './pages/partners/PartnersListPage';
import { PartnerDetailPage } from './pages/partners/PartnerDetailPage';
import { PartnerTypesPage } from './pages/PartnerTypesPage';
import { PartnerCategoriesPage } from './pages/PartnerCategoriesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { AssignmentDetailPage } from './pages/assignments/AssignmentDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesPage } from './pages/SalesPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SupplierProductsPage } from './pages/SupplierProductsPage';
import { SuppliesPage } from './pages/SuppliesPage';
import { ResellerPurchasesPage } from './pages/ResellerPurchasesPage';
import { AffiliateLinksPage } from './pages/AffiliateLinksPage';
import { AffiliateEnquiriesPage } from './pages/AffiliateEnquiriesPage';
import { BusinessSourcesPage } from './pages/BusinessSourcesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { LedgerPage } from './pages/LedgerPage';
import { SettlementsPage } from './pages/SettlementsPage';
import { UsersPage } from './pages/UsersPage';
import { PortalDashboardPage } from './pages/portal/PortalDashboardPage';
import { PortalSalesPage } from './pages/portal/PortalSalesPage';
import { PortalCommissionsPage } from './pages/portal/PortalCommissionsPage';
import { PortalAssignmentsPage } from './pages/portal/PortalAssignmentsPage';
import { PortalSupplierProductsPage } from './pages/portal/PortalSupplierProductsPage';
import { PortalSupplyHistoryPage } from './pages/portal/PortalSupplyHistoryPage';
import { PortalSupplierDuePage } from './pages/portal/PortalSupplierDuePage';
import { PortalSupplierPaymentHistoryPage } from './pages/portal/PortalSupplierPaymentHistoryPage';
import { PortalResellerPurchasesPage } from './pages/portal/PortalResellerPurchasesPage';
import { PortalResellerDuePage } from './pages/portal/PortalResellerDuePage';
import { PortalResellerPaymentHistoryPage } from './pages/portal/PortalResellerPaymentHistoryPage';
import { PortalProfilePage } from './pages/portal/PortalProfilePage';
import { PortalEnquiriesPage } from './pages/portal/PortalEnquiriesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/app" replace />} />

      <Route element={<ProtectedRoute section="app" />}>
        <Route path="/app" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="how-it-works" element={<HowItWorksPage audience="admin" />} />
          <Route path="partners" element={<PartnersListPage />} />
          <Route path="partners/:id" element={<PartnerDetailPage />} />
          <Route path="partner-types" element={<PartnerTypesPage />} />
          <Route path="partner-categories" element={<PartnerCategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="supplier-products" element={<SupplierProductsPage />} />
          <Route path="supplies" element={<SuppliesPage />} />
          <Route path="reseller-purchases" element={<ResellerPurchasesPage />} />
          <Route path="affiliate-links" element={<AffiliateLinksPage />} />
          <Route path="affiliate-enquiries" element={<AffiliateEnquiriesPage />} />
          <Route path="business-sources" element={<BusinessSourcesPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="service-assignments" element={<AssignmentsPage key="service" assignmentType="service" title="Service Assignments" />} />
          <Route path="deliveries" element={<AssignmentsPage key="delivery" assignmentType="delivery" title="Delivery Assignments" />} />
          <Route path="assignments/:id" element={<AssignmentDetailPage basePath="/app/assignments" />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="service-payments" element={<PaymentsPage key="service" assignmentType="service" title="Service Payments" />} />
          <Route path="delivery-payments" element={<PaymentsPage key="delivery" assignmentType="delivery" title="Delivery Payments" />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute section="portal" />}>
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalDashboardPage />} />
          <Route path="how-it-works" element={<HowItWorksPage audience="partner" />} />
          <Route path="sales" element={<PortalSalesPage mode="sales" />} />
          <Route path="referrals" element={<PortalSalesPage key="referrals" mode="referrals" />} />
          <Route path="enquiries" element={<PortalEnquiriesPage />} />
          <Route path="commission-payments" element={<PortalCommissionsPage />} />
          <Route path="assignments" element={<PortalAssignmentsPage />} />
          <Route path="assignments/:id" element={<AssignmentDetailPage basePath="/portal/assignments" />} />
          <Route path="supplier-products" element={<PortalSupplierProductsPage />} />
          <Route path="supplies" element={<PortalSupplyHistoryPage />} />
          <Route path="payments-due" element={<Navigate to="/portal/outstanding-balance" replace />} />
          <Route path="outstanding-balance" element={<PortalSupplierDuePage />} />
          <Route path="payment-history" element={<PortalSupplierPaymentHistoryPage />} />
          <Route path="reseller-purchases" element={<PortalResellerPurchasesPage />} />
          <Route path="reseller-payments-due" element={<PortalResellerDuePage />} />
          <Route path="reseller-outstanding-balance" element={<Navigate to="/portal/reseller-payments-due" replace />} />
          <Route path="reseller-payment-history" element={<PortalResellerPaymentHistoryPage />} />
          <Route path="profile" element={<PortalProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
