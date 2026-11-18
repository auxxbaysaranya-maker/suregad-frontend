import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardShell, PublicShell } from "./components/layout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { CartPage, CheckoutPage, ProductPage } from "./pages/ProductPage";
import { StorefrontPage } from "./pages/Storefront";
import { StorefrontEditor } from "./pages/StorefrontEditor";
import { ScrollManager } from "./components/navigation";
import { LoginPage } from "./pages/LoginPage";
import { AccountHome, AddressPage, AdminHome, AdminListings, AdminPeople, ApplyPartnerPage, InspectionsPage, NewListingPage, OrdersPage, PartnerJobs, SellerHome, SellerOrdersPage, StaticInfo, SupportPage, WishlistPage } from "./pages/Dashboards";
import { AdminConfigure } from "./pages/AdminStudio";
import { InspectionReportPage, PartnerEarnings, PartnerJobPage } from "./pages/PartnerJob";
import { PanelAuth } from "./pages/PanelAuth";
import { PanelShell } from "./components/layout";
import { useSession } from "./store/session";
import { ChatPage } from "./pages/ChatPage";
import { RealtimeBridge } from "./components/RealtimeBridge";
import { LocationBootstrap } from "./components/LocationPicker";

function Guard({ children, role, loginTo = "/login" }: { children: React.ReactNode; role?: string; loginTo?: string }) {
  const { ready, profile } = useSession();
  if (!ready) return <p className="p-6 text-sm">Checking session…</p>;
  if (!profile) return <Navigate to={loginTo} replace />;
  if (role && !profile.roles.includes(role)) return <Navigate to={loginTo} replace />;
  return children;
}

export function App() {
  return (
    <>
    <ScrollManager />
    <RealtimeBridge />
    <LocationBootstrap />
    <Routes>
      <Route path="/" element={<PublicShell><HomePage /></PublicShell>} />
      <Route path="/search" element={<PublicShell><SearchPage /></PublicShell>} />
      <Route path="/product/:slug" element={<PublicShell hideTabs hideBack><ProductPage /></PublicShell>} />
      <Route path="/chat" element={<Guard><ChatPage /></Guard>} />
      <Route path="/chat/:id" element={<Guard><ChatPage /></Guard>} />
      <Route path="/seller/:slug" element={<PublicShell hideBack><StorefrontPage kind="seller" /></PublicShell>} />
      <Route path="/store/:slug" element={<PublicShell hideBack><StorefrontPage kind="store" /></PublicShell>} />
      <Route path="/cart" element={<PublicShell><CartPage /></PublicShell>} />
      <Route path="/checkout" element={<PublicShell><Guard><CheckoutPage /></Guard></PublicShell>} />
      <Route path="/login" element={<PublicShell><LoginPage /></PublicShell>} />
      <Route path="/how-it-works" element={<PublicShell><StaticInfo title="How verification works" body={["Choose a plan for the device category. Payment creates an inspection request only after the gateway verifies the transaction.", "SureGad offers the job to an approved partner inside their service radius who covers that category and is not paused.", "The published report keeps critical failures visible. It is a record of that visit, not a promise about future faults."]} /></PublicShell>} />
      <Route path="/become-a-seller" element={<PublicShell><StaticInfo title="Sell on SureGad" body={["Individuals can list from the same account they use to buy. The free plan limits are stored as configuration and checked again on every create request.", "Showrooms submit business details and documents. Listings stay blocked until an admin approves the business and a subscription is active."]} /></PublicShell>} />
      <Route path="/become-a-partner" element={<PublicShell><ApplyPartnerPage /></PublicShell>} />
      <Route path="/account/*" element={<Guard><DashboardShell title="Buyer" links={accountLinks}><AccountRoutes /></DashboardShell></Guard>} />
      <Route path="/sell/*" element={<Navigate to="/showroom" replace />} />
      <Route path="/showroom/login" element={<PanelAuth panel="showroom" mode="login" />} />
      <Route path="/showroom/signup" element={<PanelAuth panel="showroom" mode="signup" />} />
      <Route path="/showroom/*" element={<Guard role="business_seller" loginTo="/showroom/login"><PanelShell title="Showroom" links={showroomLinks}><ShowroomRoutes /></PanelShell></Guard>} />
      <Route path="/partner/login" element={<PanelAuth panel="partner" mode="login" />} />
      <Route path="/partner/signup" element={<PanelAuth panel="partner" mode="signup" />} />
      <Route path="/partner/*" element={<Guard role="service_partner" loginTo="/partner/login"><PanelShell title="Partner" links={partnerLinks}><PartnerRoutes /></PanelShell></Guard>} />
      <Route path="/admin/login" element={<PanelAuth panel="admin" mode="login" />} />
      <Route path="/admin/*" element={<Guard role="super_admin" loginTo="/admin/login"><PanelShell title="Super admin" links={adminLinks}><AdminRoutes /></PanelShell></Guard>} />
      <Route path="*" element={<PublicShell><StaticInfo title="Page not found" body={["That address is not part of SureGad."]} /></PublicShell>} />
    </Routes>
    </>
  );
}

function AccountRoutes() {
  return (
    <Routes>
      <Route index element={<AccountHome />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="wishlist" element={<WishlistPage />} />
      <Route path="messages" element={<Navigate to="/chat" replace />} />
      <Route path="inspections/:reportId" element={<InspectionReportPage />} />
      <Route path="inspections" element={<InspectionsPage />} />
      <Route path="addresses" element={<AddressPage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="storefront" element={<StorefrontEditor kind="seller" />} />
    </Routes>
  );
}

function ShowroomRoutes() {
  return (
    <Routes>
      <Route index element={<SellerHome />} />
      <Route path="listings" element={<NewListingPage />} />
      <Route path="orders" element={<SellerOrdersPage />} />
      <Route path="storefront" element={<StorefrontEditor kind="store" />} />
      <Route path="messages" element={<Navigate to="/chat?box=selling" replace />} />
    </Routes>
  );
}

function PartnerRoutes() {
  return (
    <Routes>
      <Route index element={<PartnerJobs />} />
      <Route path="earnings" element={<PartnerEarnings />} />
      <Route path="jobs/:id" element={<PartnerJobPage />} />
      <Route path="jobs" element={<PartnerJobs />} />
    </Routes>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminHome />} />
      <Route path="listings" element={<AdminListings />} />
      <Route path="people" element={<AdminPeople />} />
      <Route path="configure" element={<AdminConfigure />} />
    </Routes>
  );
}

const accountLinks = [
  { to: "/account", label: "Overview" },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/wishlist", label: "Wishlist" },
  { to: "/chat", label: "Chats" },
  { to: "/account/storefront", label: "My storefront" },
  { to: "/account/inspections", label: "Inspections" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/support", label: "Support" },
];

const showroomLinks = [
  { to: "/showroom", label: "Dashboard" },
  { to: "/showroom/listings", label: "Listings" },
  { to: "/showroom/orders", label: "Orders" },
  { to: "/chat?box=selling", label: "Chats" },
  { to: "/showroom/storefront", label: "Storefront" },
];

const partnerLinks = [
  { to: "/partner", label: "Jobs" },
  { to: "/partner/earnings", label: "Earnings" },
];

const adminLinks = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/listings", label: "Listings" },
  { to: "/admin/people", label: "Approvals" },
  { to: "/admin/configure", label: "Configure" },
];
