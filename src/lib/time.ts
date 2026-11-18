const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

/** "Just now", "5 min ago", "3 hours ago", "Yesterday", "4 days ago", "12 Mar". */
export function timeAgo(value?: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Inbox timestamp: time today, "Yesterday", weekday this week, otherwise a short date. */
export function inboxTime(value?: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return clock(date);
  if (date.getTime() >= startOfToday - day) return "Yesterday";
  if (date.getTime() >= startOfToday - 6 * day) return date.toLocaleDateString("en-IN", { weekday: "short" });
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function clock(value: string | Date): string {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** Date separator label inside a chat thread. */
export function dayLabel(value: string | Date): string {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - day) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function lastSeen(online: boolean, value?: string | null): string {
  if (online) return "Active now";
  if (!value) return "Offline";
  return `Last seen ${timeAgo(value).toLowerCase()}`;
}
