import { Link } from "react-router-dom";
import { History } from "lucide-react";
import type { Listing } from "../ProductCard";
import { DeviceFallback } from "../illustrations";
import { money } from "../../lib/utils";

/** Compact pill-cards so the shopper can jump back to something they looked at. */
export function RecentlyViewed({ products }: { products: Listing[] }) {
  if (!products.length) return null;
  return (
    <section className="py-8">
      <h2 className="mb-4 flex items-center gap-2 text-[20px]">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600"><History size={16} /></span>
        Pick up where you left off
      </h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.slug}`}
            className="group flex w-[270px] shrink-0 items-center gap-3 rounded-[20px] bg-white p-2 pr-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200"
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50">
              {product.images?.[0]?.url ? (
                <img src={product.images[0].url} alt="" loading="lazy" className="h-[85%] w-[85%] object-contain transition duration-500 group-hover:scale-110" />
              ) : (
                <DeviceFallback laptop={product.categorySlug === "laptops"} className="scale-75" />
              )}
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{product.title}</span>
              <span className="mt-1 block font-display text-[16px] font-bold">{money(product.pricePaise)}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
