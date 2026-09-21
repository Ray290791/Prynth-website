/**
 * Tracks the last 10 product pages viewed in localStorage.
 * Works client-side only — call from useEffect.
 */

import { recordProductViewDb } from "./history-fns";

const KEY = "prynth-history";
const MAX = 10;

export function recordProductView(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const filtered = existing.filter((s) => s !== slug);
    const next = [slug, ...filtered].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    
    // Attempt to sync to DB if user has a session token (we don't want to fail if they are a guest)
    const hasSession = document.cookie.includes("prynth.session_token");
    if (hasSession) {
      recordProductViewDb({ data: { slug } }).catch(() => {});
    }
  } catch {
    // ignore localstorage error
  }
}

export function getProductHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getLastVisited(): string | null {
  const history = getProductHistory();
  return history[0] ?? null;
}
