"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";

const tabs = [
  { href: "/", label: "Overview" },
  { href: "/business-models", label: "Business Models" },
  { href: "/assessment", label: "Assessment" },
  { href: "/funnel", label: "Funnel" },
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

  latestChildrenRef.current = children;

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
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white pb-3 pt-4 sm:pb-4 sm:pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">DYSTRY</div>
              <div className="mt-1 hidden text-xs text-zinc-500 sm:block">
                PHASE 0 · DISTRIBUTION BIBLE · V1.0 · MAY 2026
              </div>
            </div>
          </div>
          <nav className="dashboard-mobile-scroll -mx-4 mt-4 flex snap-x snap-mandatory flex-nowrap items-center gap-0 overflow-x-auto border-y border-zinc-200 bg-white px-4 sm:mx-0 sm:mt-5 sm:flex-wrap sm:px-0">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={clsx(
                    "shrink-0 snap-start whitespace-nowrap border-b-2 px-5 py-4 text-[12px] uppercase tracking-[0.18em] transition sm:px-7 sm:text-[13px] sm:tracking-[0.24em]",
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
