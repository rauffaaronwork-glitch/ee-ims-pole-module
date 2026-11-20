"use client";

// Prototype-only store: keeps poles in localStorage so a scan made on the
// Scanner page shows up on the Map and in Faculty Review.
// In EE-IMS this is replaced by the database (see prisma/schema.prisma)
// and the /api/poles route.
import { useSyncExternalStore } from "react";
import { SAMPLE_POLES } from "./mock";
import type { Pole } from "./types";

const KEY = "ims-pole-module-v1";
let cache: Pole[] | null = null;
const listeners = new Set<() => void>();

function load(): Pole[] {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    cache = raw ? (JSON.parse(raw) as Pole[]) : SAMPLE_POLES;
  } catch {
    cache = SAMPLE_POLES;
  }
  return cache;
}

function save(next: Pole[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: keep in memory only
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next.map((p) => ({ ...p, photo: undefined }))));
    } catch {}
  }
  listeners.forEach((l) => l());
}

export function usePoles(): Pole[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    load,
    () => SAMPLE_POLES,
  );
}

export function addPole(p: Pole) {
  save([p, ...load()]);
}

export function updatePole(id: string, patch: Partial<Pole>) {
  save(load().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export function resetPoles() {
  save(SAMPLE_POLES);
}

export const STATUS_META: Record<Pole["status"], { label: string; color: string; text: string; bg: string }> = {
  pending: { label: "Pending review", color: "#fbbf24", text: "text-amber-300", bg: "bg-amber-400/10 border-amber-400/30" },
  verified: { label: "Verified", color: "#10b981", text: "text-emerald-300", bg: "bg-emerald-400/10 border-emerald-400/30" },
  needs_repair: { label: "Needs repair", color: "#ef4444", text: "text-red-300", bg: "bg-red-400/10 border-red-400/30" },
  rejected: { label: "Rejected", color: "#6b7280", text: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/30" },
};
