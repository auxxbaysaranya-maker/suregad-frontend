import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Globe,
  MessageCircle,
  Home,
  Laptop,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "../store/session";
import { api } from "../lib/api";
import { readLocale, t, type Locale } from "../lib/i18n";
import { cn } from "../lib/utils";
import { Logo, Mark } from "./brand";
import { LocationChip } from "./LocationPicker";
import { BackButton } from "./navigation";
import { adminUrl } from "../lib/config";

const buyerTabs = [
  ["/", Home, "Home"],
  ["/search", LayoutGrid, "Browse"],
  ["/chat", MessageCircle, "Chats"],
  ["/sell", Tag, "Sell"],
  ["/account", UserRound, "Account"],
] as const;

/** Unread chat messages for the signed-in user; refreshed by RealtimeBridge on socket events. */
export function useChatUnread() {
  const profile = useSession((state) => state.profile);
  const query = useQuery({
    queryKey: ["chat-unread"],
    enabled: Boolean(profile),
    refetchInterval: 60_000,
    queryFn: async () => (await api.get("/chat/unread")).data.data as { count: number },
  });
  return profile ? query.data?.count || 0 : 0;
}

const announcements = [
  { icon: ShieldCheck, text: "Inspection reports stay with the listing", to: "/how-it-works", cta: "How verification works" },
  { icon: LockKeyhole, text: "Orders are marked paid only after the gateway verifies payment", to: "/how-it-works", cta: "Learn more" },
  { icon: BadgeCheck, text: "Showrooms are approved by our team before they can publish", to: "/become-a-seller", cta: "Sell on SureGad" },
];

const searchHints = ["iPhone 13 128 GB", "ThinkPad with 16 GB RAM", "Samsung Galaxy S23", "MacBook Air M1", "phones under ₹15,000"];

function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % announcements.length), 4500);
    return () => window.clearInterval(timer);
  }, []);
  const item = announcements[index];
  return (
    <div className="relative overflow-hidden bg-brand-gradient text-white">
      <div className="mx-auto flex h-9 max-w-[1280px] items-center justify-center px-4 text-[13px] font-medium md:justify-between">
        <p className="hidden items-center gap-1.5 text-white/80 md:flex">
          <Sparkles size={14} /> Used & refurbished phones and laptops
        </p>
        <div className="relative h-9 min-w-0 flex-1 md:flex-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex h-9 items-center justify-center gap-2 truncate"
            >
              <item.icon size={15} className="shrink-0" />
              <span className="truncate">{item.text}</span>
              <Link to={item.to} className="hidden shrink-0 underline decoration-white/50 underline-offset-2 hover:decoration-white sm:inline">
                {item.cta}
              </Link>
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="hidden items-center gap-4 text-white/85 md:flex">
          <Link to="/become-a-partner" className="hover:text-white">Become a partner</Link>
          <a href={adminUrl("login")} className="hover:text-white">Seller & partner hub</a>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(0);
  useEffect(() => {
    if (focused || query) return;
    const timer = window.setInterval(() => setHint((value) => (value + 1) % searchHints.length), 2600);
    return () => window.clearInterval(timer);
  }, [focused, query]);
  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (scope) params.set("category", scope);
    navigate(`/search${params.toString() ? `?${params}` : ""}`);
  }
  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        "group/search flex h-12 items-center rounded-full bg-white p-1 ring-1 transition-all duration-300",
        focused ? "shadow-[0_0_0_4px_rgb(93_85_234_/_0.14),0_12px_30px_-12px_rgb(58_63_224_/_0.35)] ring-brand-400" : "ring-line hover:ring-brand-200",
        className,
      )}
    >
      <label className="relative hidden h-full shrink-0 items-center sm:flex">
        <span className="sr-only">Search in</span>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className="h-full cursor-pointer appearance-none rounded-full bg-brand-50 pr-8 pl-4 text-[13px] font-semibold text-brand-800 outline-none hover:bg-brand-100"
        >
          <option value="">All devices</option>
          <option value="smartphones">Phones</option>
          <option value="laptops">Laptops</option>
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 text-brand-700" />
      </label>
      <div className="relative flex h-full min-w-0 flex-1 items-center">
        <Search size={18} className="ml-3 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Search devices"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] text-ink outline-none"
        />
        {!query ? (
          <span className="pointer-events-none absolute inset-y-0 left-[42px] flex items-center overflow-hidden text-[14px] whitespace-nowrap text-muted/80">
            Search&nbsp;
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={hint} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3 }}>
                “{searchHints[hint]}”
              </motion.span>
            </AnimatePresence>
          </span>
        ) : null}
      </div>
      <button
        type="submit"
        aria-label="Search"
        className="grid aspect-square h-full shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:brightness-110 active:scale-[0.94]"
      >
        <Search size={19} strokeWidth={2.4} className="transition-transform duration-300 group-focus-within/search:scale-110" />
      </button>
    </form>
  );
}

function HeaderAction({ to, label, icon: Icon, badge, className }: { to: string; label: string; icon: LucideIcon; badge?: number; className?: string }) {
  return (
    <Link to={to} className={cn("group relative flex items-center gap-2 rounded-full px-2.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-brand-50", className)} aria-label={label}>
      <span className="relative">
        <Icon size={21} strokeWidth={1.9} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
        {badge ? (
          <span key={badge} className="absolute -top-2 -right-2.5 grid h-[18px] min-w-[18px] animate-bump place-items-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className={cn("hidden xl:inline", badge ? "pl-1.5" : "")}>{label}</span>
    </Link>
  );
}

const navLinks: { to: string; label: (locale: Locale) => string; icon: LucideIcon; highlight?: boolean }[] = [
  { to: "/search?category=smartphones", label: (locale) => t(locale, "phones"), icon: Smartphone },
  { to: "/search?category=laptops", label: (locale) => t(locale, "laptops"), icon: Laptop },
  { to: "/search?inspected=true", label: () => "Inspected", icon: ShieldCheck, highlight: true },
  { to: "/search?sellerType=business", label: () => "Refurbished", icon: Store },
  { to: "/search?condition=like_new", label: () => "Like new", icon: Sparkles },
  { to: "/search?maxPrice=15000", label: () => "Under ₹15K", icon: Tag },
  { to: "/sellers", label: () => "Sellers near you", icon: MapPin },
  { to: "/partners", label: () => "Inspection partners", icon: Wrench },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const profile = useSession((state) => state.profile);
  const cart = useQuery({
    queryKey: ["cart"],
    enabled: Boolean(profile),
    queryFn: async () => (await api.get("/cart")).data.data as { items?: unknown[] },
  });
  const cartCount = cart.data?.items?.length || 0;
  const chatUnread = useChatUnread();
  const [locale, setLocale] = useState<Locale>(readLocale);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  function chooseLocale(next: Locale) {
    localStorage.setItem("sg_locale", next);
    setLocale(next);
    window.dispatchEvent(new Event("sg-locale"));
    if (profile) void api.patch("/auth/me", { locale: next });
  }
  const detail = pathname.startsWith("/product/");
  return (
    <>
      <AnnouncementBar />
      <header className={cn("sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl transition-shadow duration-300", scrolled ? "border-line shadow-[0_8px_30px_-18px_rgb(16_17_55_/_0.35)]" : "border-transparent")}>
        <div className="mx-auto max-w-[1280px] px-4">
          <div className="flex items-center gap-3 py-3 lg:gap-6">
            <Link to="/" className="shrink-0 transition-opacity hover:opacity-85" aria-label="SureGad home">
              <Logo className="h-8 sm:h-9" />
            </Link>
            <LocationChip className="hidden max-w-[190px] md:flex" />
            {detail ? <div className="flex-1" /> : <SearchBar className="hidden max-w-[640px] flex-1 md:flex" />}
            <div className="ml-auto flex items-center gap-0.5">
              <label className="relative hidden items-center rounded-full px-2 text-muted transition hover:bg-brand-50 hover:text-ink lg:flex">
                <Globe size={16} />
                <span className="sr-only">Language</span>
                <select value={locale} onChange={(event) => chooseLocale(event.target.value as Locale)} className="cursor-pointer appearance-none bg-transparent py-2 pl-1.5 text-[13px] font-semibold outline-none">
                  <option value="en">EN</option>
                  <option value="ml">ML</option>
                  <option value="hi">HI</option>
                </select>
              </label>
              <LocationChip compact className="max-w-[128px] md:hidden" />
              <HeaderAction to={profile ? "/chat" : "/login"} label="Chats" icon={MessageCircle} badge={chatUnread} />
              <HeaderAction to={profile ? "/account" : "/login"} label={profile ? profile.displayName.split(" ")[0] : "Sign in"} icon={UserRound} className="hidden sm:flex" />
              <HeaderAction to="/cart" label="Cart" icon={ShoppingBag} badge={cartCount} />
            </div>
          </div>
          {detail ? null : <SearchBar className="mb-3 md:hidden" />}
          <nav className="no-scrollbar -mx-4 hidden items-center gap-1 overflow-x-auto px-4 pb-2.5 lg:flex" aria-label="Shop">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "group relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
                  link.highlight ? "bg-brand-50 text-brand-700 hover:bg-brand-100" : "text-ink-soft hover:bg-canvas hover:text-ink",
                )}
              >
                <link.icon size={15} className={cn("transition-transform duration-300 group-hover:scale-110", link.highlight ? "text-brand-600" : "text-muted group-hover:text-brand-600")} />
                {link.label(locale)}
              </Link>
            ))}
            <Link to="/sell" className="group ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-gradient px-4 py-1.5 text-[13px] font-semibold text-ink transition hover:shadow-glow">
              <span className="text-gradient">Sell your gadget</span>
              <ArrowRight size={14} className="text-violet transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const columns = [
    ["Shop", [["/search?category=smartphones", "Mobiles"], ["/search?category=laptops", "Laptops"], ["/search?inspected=true", "Inspected devices"], ["/search?sellerType=business", "Refurbished"]]],
    ["Help", [["/account/support", "Contact support"], ["/how-it-works", "How inspection works"], ["/account/orders", "Your orders"]]],
    ["Sell", [["/sell", "Sell your device"], ["/account/listings", "My listings"], [adminUrl("login"), "Seller sign in"], [adminUrl("signup?as=seller"), "Register a showroom"]]],
    ["Partners", [["/become-a-partner", "Become a partner"], [adminUrl("login"), "Partner sign in"]]],
  ] as const;
  return (
    <footer className="relative mt-16 hidden overflow-hidden rounded-t-[36px] bg-ink text-white/70 lg:block">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-brand-600/40 blur-[120px]" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-4 pt-14 pb-10 md:grid-cols-[1.3fr_2fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-glow">
              <Mark className="h-9 w-9" />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-white">SureGad</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6">
            A marketplace for used and refurbished phones and laptops. Buyers can book an independent physical inspection, and the report stays on the listing.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
            {["Gateway-verified payments", "Admin-approved showrooms", "Private seller numbers"].map((item) => (
              <span key={item} className="rounded-full bg-white/8 px-3 py-1 ring-1 ring-white/10">{item}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map(([title, links]) => (
            <div key={title} className="space-y-2.5 text-sm">
              <p className="mb-3 font-display text-[15px] font-semibold text-white">{title}</p>
              {links.map(([to, label]) =>
                to.startsWith("http") ? (
                  <a key={label} className="block transition hover:translate-x-0.5 hover:text-white" href={to}>{label}</a>
                ) : (
                  <Link key={label} className="block transition hover:translate-x-0.5 hover:text-white" to={to}>{label}</Link>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-[1280px] px-4 py-6 pb-32 text-xs leading-5 text-white/50 lg:pb-6">
          © {new Date().getFullYear()} SureGad · Inspection reports describe condition on the inspection date and are not a guarantee of future reliability.
        </p>
      </div>
    </footer>
  );
}

export function MobileTabs({ items }: { items?: { to: string; label: string; Icon?: LucideIcon; badge?: number }[] }) {
  const chatUnread = useChatUnread();
  const entries: { to: string; label: string; Icon?: LucideIcon; badge?: number }[] = items ?? buyerTabs.map(([to, Icon, label]) => ({ to, label, Icon, badge: to === "/chat" ? chatUnread : 0 }));
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 grid rounded-[26px] bg-white/90 p-1.5 shadow-[0_16px_40px_-12px_rgb(16_17_55_/_0.35)] ring-1 ring-line backdrop-blur-xl lg:hidden"
      style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
    >
      {entries.map((entry, index) => (
        <NavLink
          key={`${entry.to}-${index}`}
          to={entry.to}
          end={entry.to === "/" || entry.to === "/account"}
          className={({ isActive }) => `relative grid place-items-center gap-0.5 rounded-[20px] py-1.5 text-[11px] font-semibold transition ${isActive ? "text-brand-700" : "text-muted"}`}
        >
          {({ isActive }) => (
            <>
              {isActive ? <motion.span layoutId="mobile-tab" className="absolute inset-0 rounded-[20px] bg-brand-50" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              {entry.Icon ? (
                <span className="relative">
                  <entry.Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} />
                  {entry.badge ? (
                    <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-gradient px-1 text-[9px] font-bold text-white ring-2 ring-white">{entry.badge}</span>
                  ) : null}
                </span>
              ) : null}
              <span className="relative">{entry.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function PublicShell({ children, hideTabs = false, hideBack = false }: { children: React.ReactNode; hideTabs?: boolean; hideBack?: boolean }) {
  const { pathname } = useLocation();
  const showBack = !hideBack && pathname !== "/";
  return (
    <div className={cn("min-h-screen bg-canvas lg:pb-0", hideTabs ? "pb-0" : "pb-24")}>
      <SiteHeader />
      <main>
        {showBack ? (
          <div className="mx-auto max-w-[1280px] px-4 pt-5">
            <BackButton />
          </div>
        ) : null}
        {children}
      </main>
      <SiteFooter />
      {hideTabs ? null : <MobileTabs />}
    </div>
  );
}

export function DashboardShell({ title, links, children }: { title: string; links: { to: string; label: string }[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-0">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden h-fit rounded-3xl bg-white p-3 shadow-card ring-1 ring-line md:block">
          <p className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={({ isActive }) => `block rounded-full px-3 py-2 text-sm font-medium transition ${isActive ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-canvas"}`}>
              {link.label}
            </NavLink>
          ))}
        </aside>
        <div>
          <BackButton className="mb-5" />
          {children}
        </div>
      </div>
      <MobileTabs items={links.slice(0, 4)} />
    </div>
  );
}
