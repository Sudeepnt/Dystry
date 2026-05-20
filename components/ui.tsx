"use client";

import clsx from "clsx";
import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";

export function Button({
  children,
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "danger";
}) {
  return (
    <button
      className={clsx(
        "inline-flex h-8 items-center justify-center gap-2 border px-3 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" && "border-black bg-white text-black hover:bg-zinc-50",
        variant === "ghost" && "border-zinc-200 bg-white text-zinc-700 hover:border-black hover:text-black",
        variant === "danger" && "border-zinc-300 bg-white text-zinc-700 hover:border-black hover:text-black",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-[12px] text-zinc-600">
      {label}
      {children}
    </label>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-9 border border-zinc-200 bg-white px-3 text-sm text-black outline-none transition placeholder:text-zinc-400 focus:border-zinc-500",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-24 resize-y border border-zinc-200 bg-white px-3 py-2 text-sm text-black outline-none transition placeholder:text-zinc-400 focus:border-zinc-500"
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-9 border border-zinc-200 bg-white px-3 text-sm text-black outline-none transition focus:border-zinc-500",
        className,
      )}
      {...props}
    />
  );
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selectedSet = new Set(selected);
  const selectedLabels = options
    .filter((option) => selectedSet.has(option.id))
    .map((option) => option.label);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePeerOpen(event: Event) {
      const peerId = (event as CustomEvent<string>).detail;
      if (peerId !== id) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("dystry:multi-select-open", handlePeerOpen);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("dystry:multi-select-open", handlePeerOpen);
    };
  }, [id]);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuWidth = Math.max(rect.width, 288);
      const viewportPadding = 12;
      const maxMenuHeight = 288;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(96, Math.min(maxMenuHeight, openAbove ? spaceAbove - 4 : spaceBelow - 4));
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding,
      );

      setMenuStyle({
        maxHeight: availableHeight,
        left,
        top: openAbove ? rect.top - availableHeight - 4 : rect.bottom + 4,
        width: menuWidth,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, selectedLabels.length]);

  function toggleOpen() {
    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) {
        window.dispatchEvent(new CustomEvent("dystry:multi-select-open", { detail: id }));
      }
      return nextOpen;
    });
  }

  function toggle(optionId: string) {
    onChange(
      selectedSet.has(optionId)
        ? selected.filter((selectedId) => selectedId !== optionId)
        : [...selected, optionId],
    );
  }

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        className="flex min-h-12 w-full cursor-pointer items-start justify-between gap-2 bg-white px-3 py-2 text-left text-sm text-zinc-800 outline-none transition focus:bg-zinc-50"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <span className={clsx("grid max-h-32 min-w-0 gap-1 overflow-y-auto pr-1 leading-5", !selectedLabels.length && "text-zinc-400")}>
          {selectedLabels.length
            ? selectedLabels.map((selectedLabel) => <span key={selectedLabel} className="break-words">{selectedLabel}</span>)
            : label}
        </span>
        <ChevronDown className={clsx("mt-0.5 shrink-0 text-zinc-400 transition", open && "rotate-180")} size={14} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] overflow-y-auto border border-zinc-200 bg-white shadow-sm"
              style={menuStyle}
            >
              {options.length ? (
                options.map((option) => {
                  const checked = selectedSet.has(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="flex w-full items-start gap-2 border-b border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 transition last:border-b-0 hover:bg-zinc-50 hover:text-black"
                      onClick={() => toggle(option.id)}
                    >
                      <span className={clsx("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border", checked ? "border-black bg-black text-white" : "border-zinc-300")}>
                        {checked ? <Check size={12} /> : null}
                      </span>
                      <span className="leading-5">{option.label}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-zinc-400">No business models</div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center border border-zinc-200 px-2 py-1 text-[12px] text-zinc-700", className)}>
      {children}
    </span>
  );
}

export function SectionHeader({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {label ? <p className="mb-1 text-[12px] text-zinc-500">{label}</p> : null}
        <h2 className="text-base font-medium text-black">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="text-3xl text-black">{value}</div>
      <div className="mt-2 text-[12px] leading-relaxed text-zinc-600">{label}</div>
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-white/90 px-4 py-10">
      <div className="w-full max-w-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-base font-medium text-black">{title}</h2>
          <button className="text-zinc-500 hover:text-black" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-[12px] text-zinc-600">
        <span>{label}</span>
        <span>{value}/5</span>
      </div>
      <div className="h-1.5 border border-zinc-200 bg-white">
        <div className="h-full bg-black" style={{ width: `${Math.max(0, Math.min(value, 5)) * 20}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">{children}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="border border-zinc-300 px-4 py-3 text-sm text-zinc-400">{message}</div>;
}
