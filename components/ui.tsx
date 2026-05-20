"use client";

import clsx from "clsx";
import { Check, ChevronDown, X } from "lucide-react";

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
  const selectedSet = new Set(selected);
  const selectedLabels = options
    .filter((option) => selectedSet.has(option.id))
    .map((option) => option.label);

  function toggle(optionId: string) {
    onChange(
      selectedSet.has(optionId)
        ? selected.filter((selectedId) => selectedId !== optionId)
        : [...selected, optionId],
    );
  }

  return (
    <details className={clsx("group relative", className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-2 bg-white px-3 py-2 text-left text-sm text-zinc-800 outline-none transition focus:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <span className={clsx("max-h-[60px] overflow-hidden leading-5", !selectedLabels.length && "text-zinc-400")}>
          {selectedLabels.length ? selectedLabels.join(", ") : label}
        </span>
        <ChevronDown className="mt-0.5 shrink-0 text-zinc-400 transition group-open:rotate-180" size={14} />
      </summary>
      <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-72 overflow-y-auto border border-zinc-200 bg-white shadow-sm">
        {options.map((option) => {
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
        })}
      </div>
    </details>
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
