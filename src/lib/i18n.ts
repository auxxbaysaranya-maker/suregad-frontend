export type Locale = "en" | "ml" | "hi";

const copy = {
  en: { search: "Search", categories: "Categories", seeAll: "See all", phones: "Phones", laptops: "Laptops", info: "Info", orders: "Orders" },
  ml: { search: "തിരയുക", categories: "വിഭാഗങ്ങൾ", seeAll: "എല്ലാം", phones: "ഫോണുകൾ", laptops: "ലാപ്ടോപ്പുകൾ", info: "വിവരം", orders: "ഓർഡറുകൾ" },
  hi: { search: "खोजें", categories: "श्रेणियाँ", seeAll: "सभी देखें", phones: "फ़ोन", laptops: "लैपटॉप", info: "जानकारी", orders: "ऑर्डर" },
} as const;

export function readLocale(): Locale {
  const stored = localStorage.getItem("sg_locale");
  return stored === "ml" || stored === "hi" ? stored : "en";
}

export function t(locale: Locale, key: keyof (typeof copy)["en"]): string {
  return copy[locale][key];
}
