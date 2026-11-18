import { BadgeCheck, Quote, Star } from "lucide-react";
import { SectionHeading } from "../brand";
import { cn } from "../../lib/utils";

export interface ReviewItem {
  rating?: number;
  body: string;
  author: string;
  meta?: string;
  verifiedPurchase?: boolean;
}

function ReviewCard({ review, index }: { review: ReviewItem; index: number }) {
  return (
    <figure className={cn("w-[320px] shrink-0 rounded-[26px] p-6 ring-1 sm:w-[360px]", index % 3 === 1 ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>
      <div className="flex items-center justify-between">
        {review.rating ? (
          <span className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star key={value} size={15} className={value <= review.rating! ? "fill-[#f5b400] text-[#f5b400]" : index % 3 === 1 ? "text-white/25" : "text-line"} />
            ))}
          </span>
        ) : (
          <span />
        )}
        <Quote size={26} className={index % 3 === 1 ? "text-orchid" : "text-brand-200"} />
      </div>
      <blockquote className={cn("mt-4 line-clamp-5 text-[15px] leading-relaxed", index % 3 === 1 ? "text-white/90" : "text-ink-soft")}>{review.body}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-display text-[15px] font-bold text-white">{review.author.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[14px] font-semibold">
            {review.author}
            {review.verifiedPurchase ? <BadgeCheck size={15} className="text-emerald-500" aria-label="Verified purchase" /> : null}
          </span>
          {review.meta ? <span className={cn("block truncate text-[12px]", index % 3 === 1 ? "text-white/55" : "text-muted")}>{review.meta}</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}

/** Two counter-scrolling rows of reviews; a static row when there are only a few. */
export function ReviewsWall({ reviews }: { reviews: ReviewItem[] }) {
  if (!reviews.length) return null;
  const moving = reviews.length >= 4;
  const rows = moving ? [reviews, [...reviews].reverse()] : [reviews];
  return (
    <section className="py-10">
      <SectionHeading
        eyebrow="Reviews"
        title={<>What buyers <span className="text-gradient">say</span></>}
        body={reviews.every((review) => review.verifiedPurchase) ? "Product reviews come from buyers with a delivered order." : "Product reviews and testimonials from SureGad buyers."}
      />
      <div className="relative left-1/2 w-screen -translate-x-1/2 space-y-4">
        {rows.map((row, rowIndex) =>
          moving ? (
            <div key={rowIndex} className="group mask-fade-x flex overflow-hidden">
              <div
                className={cn("flex shrink-0 group-hover:[animation-play-state:paused]", rowIndex ? "animate-marquee-reverse" : "animate-marquee")}
                style={{ ["--marquee-duration" as string]: `${row.length * 9}s` }}
              >
                {[...row, ...row].map((review, index) => (
                  <div key={index} className="pr-4" aria-hidden={index >= row.length}>
                    <ReviewCard review={review} index={index + rowIndex} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={rowIndex} className="no-scrollbar mx-auto flex max-w-[1280px] gap-4 overflow-x-auto px-4">
              {row.map((review, index) => (
                <ReviewCard key={index} review={review} index={index} />
              ))}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
