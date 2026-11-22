import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDiscovery } from "../store/location";
import { NearbyBar } from "../components/NearbyBar";
import { api } from "../lib/api";
import { Empty } from "../components/ui";
import { ProductRail, type Listing } from "../components/ProductCard";
import { HeroCarousel, type Banner } from "../components/home/HeroCarousel";
import { HeroTiles } from "../components/home/HeroTiles";
import { TrustRibbon } from "../components/home/TrustRibbon";
import { CategoryScroller } from "../components/home/CategoryScroller";
import { BudgetTags } from "../components/home/BudgetTags";
import { InspectionShowcase, type InspectionPlanSummary } from "../components/home/InspectionShowcase";
import { RefurbishedSpotlight } from "../components/home/RefurbishedSpotlight";
import { BrandMarquee } from "../components/home/BrandMarquee";
import { TabbedArrivals } from "../components/home/TabbedArrivals";
import { ConditionGuide } from "../components/home/ConditionGuide";
import { ReviewsWall, type ReviewItem } from "../components/home/ReviewsWall";
import { SellBanner } from "../components/home/SellBanner";
import { RecentlyViewed } from "../components/home/RecentlyViewed";
import { Newsletter } from "../components/home/Newsletter";
import { Reveal } from "../components/home/Reveal";

interface HomeData {
  cms: {
    hero?: { eyebrow?: string; title?: string; subtitle?: string };
    banners?: (Banner & { active?: boolean })[];
    testimonials?: { name: string; quote: string; city?: string }[];
  };
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  trending: Listing[];
  fresh: Listing[];
  refurbished: Listing[];
  laptops: Listing[];
  inspected: Listing[];
  reviews: { rating: number; body: string; verifiedPurchase?: boolean; product?: string; author: string }[];
  /** Which sections are near the active location (null when no location was sent). */
  nearby: { radiusKm: number; trending: boolean; fresh: boolean; inspected: boolean; refurbished: boolean; laptops: boolean; showrooms: boolean; sellers: boolean } | null;
}

const defaultBanners: Banner[] = [
  { title: "Smart gadgets. Smarter prices.", body: "Compare used and refurbished phones and laptops from independent sellers and approved showrooms.", to: "/search" },
  { title: "Inspected by a partner. Reported on the listing.", body: "An inspection is published only after a partner visit. Most listings are not inspected by SureGad.", to: "/search?inspected=true" },
  { title: "Your old gadget can find a buyer.", body: "List a phone or laptop from your account. Showrooms need approval before they publish.", to: "/become-a-seller" },
];

const fallbackChecks = ["Display", "Battery", "Network", "Activation lock", "Water damage indicators"];

export function HomePage() {
  // Re-fetched whenever the active location or radius changes (the key carries both).
  const discovery = useDiscovery();
  const home = useQuery({
    queryKey: ["home", discovery.key],
    queryFn: async () => (await api.get("/marketplace/home", { params: discovery.params || {} })).data.data as HomeData,
    placeholderData: keepPreviousData,
  });
  const plans = useQuery({
    queryKey: ["inspection-plans"],
    queryFn: async () => (await api.get("/inspection-plans")).data.data as InspectionPlanSummary[],
    staleTime: 5 * 60_000,
  });
  const [viewed, setViewed] = useState<Listing[]>([]);
  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("sg_viewed") || "[]") as string[];
    if (!ids.length) return;
    void api
      .get("/products", { params: { ids: ids.slice(0, 8).join(",") } })
      .then((response) => setViewed(response.data.data as Listing[]))
      .catch(() => setViewed([]));
  }, []);

  const data = home.data;
  const loading = home.isLoading;
  const banners = useMemo(() => {
    const fromCms = (data?.cms.banners || []).filter((banner) => banner.active !== false);
    return fromCms.length ? fromCms : defaultBanners;
  }, [data]);

  const criticalChecks = useMemo(() => {
    const phonePlan = (plans.data || [])
      .filter((plan) => plan.categorySlug === "smartphones")
      .sort((a, b) => b.checklist.length - a.checklist.length)[0];
    const critical = phonePlan?.checklist.filter((item) => item.critical).map((item) => item.label) || [];
    return critical.length >= 3 ? critical : fallbackChecks;
  }, [plans.data]);

  const reviews = useMemo<ReviewItem[]>(() => {
    const product = (data?.reviews || []).map((review) => ({
      rating: review.rating,
      body: review.body,
      author: review.author,
      meta: review.product,
      verifiedPurchase: review.verifiedPurchase,
    }));
    const testimonials = (data?.cms.testimonials || []).map((item) => ({ body: item.quote, author: item.name, meta: item.city }));
    return [...product, ...testimonials].filter((review) => review.body?.trim());
  }, [data]);

  return (
    <div className="mx-auto max-w-[1280px] px-4">
      <section className="grid gap-4 pt-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <HeroCarousel banners={banners} products={[data?.trending[0] || data?.fresh[0], data?.laptops[0]]} checks={criticalChecks} />
        <HeroTiles checks={criticalChecks} />
      </section>

      <Reveal className="mt-5">
        <TrustRibbon />
      </Reveal>

      <NearbyBar className="mt-5" matched={!data?.nearby || data.nearby.fresh || data.nearby.trending} />

      <CategoryScroller categories={data?.categories || []} />

      <ProductRail
        eyebrow="Trending"
        title={<>Trending <span className="text-gradient">gadgets</span></>}
        body="Featured and most-viewed devices right now."
        products={data?.trending || []}
        loading={loading}
        autoPlay={3200}
        to="/search?sort=views"
      />

      <BudgetTags />

      <RefurbishedSpotlight products={data?.refurbished || []} loading={loading} />

      <BrandMarquee brands={data?.brands || []} />

      <TabbedArrivals fresh={data?.fresh || []} laptops={data?.laptops || []} loading={loading} />

      <InspectionShowcase plans={plans.data || []} products={data?.inspected || []} />

      <ConditionGuide />

      <ReviewsWall reviews={reviews} />

      <SellBanner />

      <RecentlyViewed products={viewed} />

      <Newsletter />

      {home.isError ? (
        <div className="py-6">
          <Empty title="Marketplace unavailable" body="The homepage could not load listings. Check that the API is running and try again." />
        </div>
      ) : null}
    </div>
  );
}
