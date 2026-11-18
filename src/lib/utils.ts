import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Format an amount stored in paise as rupees, e.g. 7400000 → ₹74,000. */
export function formatInr(paise: number): string {
  return inr.format(paise / 100);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(paise?: number | null) {
  if (paise === undefined || paise === null) return "—";
  return formatInr(paise);
}

export function titleCase(value?: string) {
  if (!value) return "";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
