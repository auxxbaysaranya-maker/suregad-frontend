import { Link } from "react-router-dom";

/** Infinite, hover-pausing strip of brand names. */
export function BrandMarquee({ brands }: { brands: { slug: string; name: string }[] }) {
  if (!brands.length) return null;
  const loop = [...brands, ...brands, ...brands, ...brands].slice(0, Math.max(brands.length * 2, 16));
  const track = [...loop, ...loop];
  return (
    <section className="relative left-1/2 my-6 w-screen -translate-x-1/2 overflow-hidden border-y border-line bg-white py-7">
      <p className="mx-auto mb-4 max-w-[1280px] px-4 text-[12px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Shop by brand</p>
      <div className="group mask-fade-x flex overflow-hidden">
        <ul className="flex shrink-0 animate-marquee items-center group-hover:[animation-play-state:paused]" style={{ ["--marquee-duration" as string]: `${track.length * 2.2}s` }}>
          {track.map((brand, index) => (
            <li key={`${brand.slug}-${index}`} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={index >= loop.length}>
              <Link
                to={`/search?brand=${brand.slug}`}
                tabIndex={index >= loop.length ? -1 : 0}
                className="font-display text-[clamp(28px,4vw,46px)] font-bold tracking-[-0.03em] text-ink/15 transition-colors duration-300 hover:text-brand-600"
              >
                {brand.name}
              </Link>
              <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-brand-gradient opacity-70" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
