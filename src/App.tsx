import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardShell, PublicShell } from "./components/layout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { CartPage, CheckoutPage, ProductPage } from "./pages/ProductPage";
import { StorefrontPage } from "./pages/Storefront";
import { ScrollManager } from "./components/navigation";
import { AuthActionPage, ForgotPasswordPage, LoginPage, SignupPage } from "./pages/Auth";
import { AccountHome, AddressPage, InspectionsPage, OrdersPage, StaticInfo, SupportPage, WishlistPage } from "./pages/Dashboards";
import { InspectionReportPage } from "./pages/InspectionReport";
import { JoinPage } from "./pages/Join";
import { useSession } from "./store/session";
import { ChatPage } from "./pages/ChatPage";
import { RealtimeBridge } from "./components/RealtimeBridge";
import { LocationBootstrap } from "./components/LocationPicker";
import { adminUrl } from "./lib/config";

function Guard({ children, loginTo = "/login" }: { children: React.ReactNode; loginTo?: string }) {
  const { ready, profile } = useSession();
  const location = useLocation();
  if (!ready) return <p className="p-6 text-sm">Checking session…</p>;
  if (!profile) return <Navigate to={loginTo} replace state={{ from: location.pathname + location.search }} />;
  return children;
}

/** Seller, partner and admin panels moved to the separate SureGad Hub app; keep old links working. */
function ToAdminPanel() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const section = pathname.split("/")[1];
    const target = /\/(signup)$/.test(pathname) ? `signup?as=${section === "partner" ? "partner" : "seller"}` : pathname.endsWith("/login") ? "login" : section === "showroom" ? "seller" : section;
    window.location.replace(adminUrl(`${target}${pathname.endsWith("/login") || pathname.endsWith("/signup") ? "" : search}`));
  }, [pathname, search]);
  return <p className="p-6 text-sm">Opening SureGad Hub…</p>;
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
        <Route path="/signup" element={<PublicShell><SignupPage /></PublicShell>} />
        <Route path="/forgot-password" element={<PublicShell><ForgotPasswordPage /></PublicShell>} />
        <Route path="/auth/action" element={<PublicShell><AuthActionPage /></PublicShell>} />
        <Route
          path="/how-it-works"
          element={
            <PublicShell>
              <StaticInfo
                title="How verification works"
                body={[
                  "Choose a plan for the device category. Payment creates an inspection request only after the gateway verifies the transaction.",
                  "SureGad offers the job to an approved partner inside their service radius who covers that category and is not paused.",
                  "The published report keeps critical failures visible. It is a record of that visit, not a promise about future faults.",
                ]}
              />
            </PublicShell>
          }
        />
        <Route path="/become-a-seller" element={<PublicShell><JoinPage kind="seller" /></PublicShell>} />
        <Route path="/become-a-partner" element={<PublicShell><JoinPage kind="partner" /></PublicShell>} />
        <Route path="/account/*" element={<Guard><DashboardShell title="Buyer" links={accountLinks}><AccountRoutes /></DashboardShell></Guard>} />
        <Route path="/showroom/*" element={<ToAdminPanel />} />
        <Route path="/partner/*" element={<ToAdminPanel />} />
        <Route path="/admin/*" element={<ToAdminPanel />} />
        <Route path="/sell/*" element={<Navigate to="/become-a-seller" replace />} />
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
    </Routes>
  );
}

const accountLinks = [
  { to: "/account", label: "Overview" },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/wishlist", label: "Wishlist" },
  { to: "/chat", label: "Chats" },
  { to: "/account/inspections", label: "Inspections" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/support", label: "Support" },
];
