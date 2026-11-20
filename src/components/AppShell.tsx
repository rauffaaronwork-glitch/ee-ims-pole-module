"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid, User, History, MessagesSquare, Send, BookOpen, Target, GraduationCap,
  FlaskConical, Library, ScanLine, Map as MapIcon, ClipboardCheck, Search, Bell,
  CalendarDays, Menu, X, Timer, MonitorSmartphone,
} from "lucide-react";
import { CURRENT_USER } from "@/lib/mock";

type NavItem = { label: string; href: string; icon: React.ElementType; live?: boolean; badge?: string };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "#", icon: LayoutGrid },
      { label: "My Profile", href: "#", icon: User },
      { label: "My Activity", href: "#", icon: History },
      { label: "Consultations", href: "#", icon: MessagesSquare },
      { label: "Inbox", href: "#", icon: Send },
    ],
  },
  {
    group: "Academics",
    items: [
      { label: "My Studies", href: "#", icon: BookOpen },
      { label: "Daily Practice", href: "#", icon: Target },
      { label: "Self & Advance Learning", href: "#", icon: Library },
      { label: "Research", href: "#", icon: FlaskConical },
      { label: "Graduation", href: "#", icon: GraduationCap },
    ],
  },
  {
    group: "Field Work",
    items: [
      { label: "Pole Scanner", href: "/student/poles/scan", icon: ScanLine, live: true, badge: "New" },
      { label: "Pole Map", href: "/poles/map", icon: MapIcon, live: true },
    ],
  },
  {
    group: "Faculty",
    items: [{ label: "Pole Review", href: "/admin/poles", icon: ClipboardCheck, live: true }],
  },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="w-56" />;
  return (
    <span className="flex items-center gap-2 font-semibold text-white">
      <CalendarDays className="h-4 w-4 text-ims-amber" />
      {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      <span className="text-ims-muted">·</span>
      <span className="tabular-nums">{now.toLocaleTimeString("en-US")}</span>
    </span>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="text-3xl font-black tracking-tight text-ims-amber">IMS</span>
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-gray-300">
          Integrated
          <br />
          Management System
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500">{g.group}</p>
            {g.items.map((it) => {
              const active = it.live && path.startsWith(it.href);
              const Icon = it.icon;
              const cls = active
                ? "bg-ims-amber text-[#1a1206] font-semibold"
                : it.live
                  ? "text-gray-200 hover:bg-white/5"
                  : "text-gray-400 hover:bg-white/5 cursor-default";
              const inner = (
                <>
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{it.label}</span>
                  {it.badge && !active && (
                    <span className="ml-auto rounded-full bg-ims-amber/15 px-2 py-0.5 text-[10px] font-semibold text-ims-amber">
                      {it.badge}
                    </span>
                  )}
                </>
              );
              return it.live ? (
                <Link key={it.label} href={it.href} onClick={onNavigate} className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${cls}`}>
                  {inner}
                </Link>
              ) : (
                <div key={it.label} title="Existing EE-IMS page (not part of this prototype)" className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${cls}`}>
                  {inner}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-ims-line px-4 py-3">
        <div className="relative grid h-9 w-9 place-items-center rounded-full bg-ims-amber text-sm font-bold text-[#1a1206]">
          {CURRENT_USER.initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ims-panel bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{CURRENT_USER.name}</p>
          <p className="text-xs text-ims-muted">{CURRENT_USER.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 border-r border-ims-line bg-ims-panel lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-[1000] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[270px] border-r border-ims-line bg-ims-panel">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-5 text-gray-400">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[500] flex items-center gap-3 border-b border-ims-line bg-ims-bg/90 px-4 py-3 backdrop-blur lg:px-6">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="text-gray-300 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-xl font-black text-ims-amber lg:hidden">IMS</span>
          <div className="hidden items-center gap-4 md:flex">
            <Clock />
            <Timer className="h-4 w-4 text-ims-muted" />
            <span className="flex items-center gap-2 rounded-full border border-ims-line px-3 py-1 text-sm">
              <CalendarDays className="h-4 w-4 text-ims-amber" />
              <span className="text-ims-muted">Current:</span> <b>2nd Sem 2026–2027</b>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-ims-line bg-ims-card px-3 py-2 text-sm text-ims-muted xl:flex xl:w-64">
              <Search className="h-4 w-4" /> Search pages...
            </div>
            <MonitorSmartphone className="hidden h-5 w-5 text-ims-muted sm:block" />
            <Bell className="h-5 w-5 text-ims-muted" />
            <span className="hidden text-sm text-gray-300 sm:inline">
              Hello <b className="text-white">Rauff Aaron</b>
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ims-amber text-xs font-bold text-[#1a1206]">
              {CURRENT_USER.initials}
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
