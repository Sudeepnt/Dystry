"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { getCounts } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Counts } from "@/lib/types";

const tabs = [
  { href: "/", label: "Overview" },
  { href: "/business-models", label: "Business Models" },
  { href: "/strategies", label: "Strategies" },
  { href: "/atomic-processes", label: "Atomic Processes" },
  { href: "/shortlist", label: "Priority 1 Shortlist" },
];

type NavDirection = "left" | "right";
type AnimatedPage = {
  direction: NavDirection;
  key: string;
  node: React.ReactNode;
  phase: "enter" | "exit" | "idle";
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const latestChildrenRef = useRef(children);
  const previousPathRef = useRef(pathname);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pages, setPages] = useState<AnimatedPage[]>([
    { key: pathname, node: children, phase: "idle", direction: "left" },
  ]);
  const [counts, setCounts] = useState<Counts>({
    businessModels: 0,
    strategies: 0,
    atomicProcesses: 0,
    shortlisted: 0,
  });

  latestChildrenRef.current = children;

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const nextCounts = await getCounts();
      if (mounted) setCounts(nextCounts);
    }

    refresh();

    const client = supabase;

    if (!client) return () => {
      mounted = false;
    };

    const channel = client
      .channel("dashboard-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_models" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "atomic_processes" }, refresh)
      .subscribe();

    return () => {
      mounted = false;
      client.removeChannel(channel);
    };
  }, []);

  useLayoutEffect(() => {
    const previousIndex = tabs.findIndex((tab) => tab.href === previousPathRef.current);
    const currentIndex = tabs.findIndex((tab) => tab.href === pathname);
    const nextDirection: NavDirection =
      previousIndex >= 0 && currentIndex >= 0 && currentIndex < previousIndex ? "right" : "left";

    if (previousPathRef.current === pathname) {
      return;
    }

    const nextPageNode = latestChildrenRef.current;

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setPages((currentPages) => {
      const activePage = currentPages.find((page) => page.phase !== "exit") ?? currentPages.at(-1);
      return [
        ...(activePage
          ? [{ ...activePage, phase: "exit" as const, direction: nextDirection }]
          : []),
        { key: pathname, node: nextPageNode, phase: "enter", direction: nextDirection },
      ];
    });

    animationTimeoutRef.current = setTimeout(() => {
      setPages([{ key: pathname, node: nextPageNode, phase: "idle", direction: nextDirection }]);
    }, 280);

    previousPathRef.current = pathname;

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [pathname]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6">
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white pb-4 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-black">DYSTRY</div>
              <div className="mt-1 text-xs text-zinc-500">
                PHASE 0 · DISTRIBUTION BIBLE · V1.0 · MAY 2026
              </div>
            </div>
            <div className="text-right text-xs leading-6 text-zinc-500">
              <span className="text-black">{counts.businessModels}</span> business models ·{" "}
              <span className="text-black">{counts.strategies}</span> distribution strategies ·{" "}
              <span className="text-black">{counts.atomicProcesses}</span> atomic processes ·{" "}
              <span className="text-black">{counts.shortlisted}</span> Priority 1 shortlisted
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap items-center gap-0 border-y border-zinc-200 bg-white">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={clsx(
                    "border-b-2 px-7 py-4 text-[13px] uppercase tracking-[0.24em] transition",
                    active
                      ? "border-black text-black"
                      : "border-transparent text-zinc-400 hover:text-black",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="dashboard-page-viewport py-6">
          {pages.map((page) => (
            <div
              key={`${page.key}-${page.phase}`}
              className={clsx(
                "dashboard-page-panel",
                page.phase !== "idle" && "dashboard-page-motion",
                page.phase === "enter" &&
                  (page.direction === "left"
                    ? "dashboard-page-enter-left"
                    : "dashboard-page-enter-right"),
                page.phase === "exit" &&
                  (page.direction === "left"
                    ? "dashboard-page-exit-left"
                    : "dashboard-page-exit-right"),
              )}
              aria-hidden={page.phase === "exit" ? true : undefined}
            >
              {page.node}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
