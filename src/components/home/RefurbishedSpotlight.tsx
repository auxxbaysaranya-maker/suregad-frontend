import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import { ProductCard, ProductCardSkeleton, ProductRail, specChips, type Listing } from "../ProductCard";
import { DeviceFallback } from "../illustrations";
import { SectionHeading } from "../brand";
import { money, titleCase } from "../../lib/utils";
import { rise, stagger } from "./Reveal";
import { ViewMore } from "./TabbedArrivals";

function FeatureCard({ product }: { product: Listing }) {
  const image = product.images?.[0]?.url;
  const chips = specChips(product);
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group relative isolate flex h-full min-h-[440px] flex-col overflow-hidden rounded-[30px] bg-[radial-gradient(120%_100%_at_20%_0%,#ffffff_0%,#efeaff_45%,#dcd2ff_100%)] p-6 ring-1 ring-brand-100 transition duration-300 hover:shadow-lift sm:p-8"
    >
      <div aria-hidden="true" className="absolute -right-16 -bottom-20 -z-10 h-80 w-80 rounded-full bg-orchid/30 blur-3xl transition duration-700 group-hover:scale-125" />
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
          <BadgeCheck size={14} /> Showroom refurbished
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold text-ink ring-1 ring-white">{titleCase(product.condition)}</span>
      </div>
      <div className="relative my-6 grid flex-1 place-items-center">
        {image ? (
          <img src={image} alt="" className="max-h-[280px] w-auto object-contain drop-shadow-[0_30px_30px_rgba(28,30,98,0.25)] transition duration-700 ease-out group-hover:scale-[1.05] group-hover:-rotate-2" />
        ) : (
          <div className="grid h-[260px] w-full place-items-center transition duration-700 group-hover:scale-105">
            <DeviceFallback laptop={product.categorySlug === "laptops"} className="max-h-[240px]" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="max-w-md text-[26px] leading-tight">{product.title}</h3>
          {chips.length ? <p className="mt-2 text-[13px] font-medium text-brand-800">{chips.join(" · ")}</p> : null}
          {product.city ? <p className="mt-1 flex items-center gap-1 text-[13px] text-muted"><MapPin size={13} /> {product.city}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-[32px] leading-none font-extrabold tracking-tight">{money(product.pricePaise)}</p>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * One feature device beside a 2×2 grid. Falls back to a rail when there are few listings.
 * The reveal container stays mounted while loading so its in-view trigger is attached from the first render.
 */
export function RefurbishedSpotlight({ products, loading }: { products: Listing[]; loading: boolean }) {
  const heading = {
    eyebrow: "From showrooms",
    title: <>Refurbished <span className="text-gradient">collection</span></>,
    body: "Listed by showrooms our team approved before they could publish.",
  };
  if (!loading && products.length < 3) {
    return <ProductRail {...heading} products={products} to="/search?sellerType=business" />;
  }
  const [lead, ...rest] = products;
  return (
    <section className="py-10">
      <SectionHeading {...heading} />
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div variants={rise}>
          {loading || !lead ? <div className="skeleton min-h-[440px] rounded-[30px]" /> : <FeatureCard product={lead} />}
        </motion.div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[460px]:grid-cols-2">
          {loading
            ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
            : rest.slice(0, 4).map((product, index) => (
                // These mount after data loads, so they animate on mount rather than relying on the parent's in-view variant.
                <motion.div key={product.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </div>
      </motion.div>
      <ViewMore to="/search?sellerType=business" label="View more refurbished" />
    </section>
  );
}
