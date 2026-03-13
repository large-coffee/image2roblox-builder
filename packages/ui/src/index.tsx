import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import React from "react";

export function AppButton(props: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      className={`rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Panel(props: PropsWithChildren<{ title: string; className?: string }>) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${props.className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{props.title}</h3>
      {props.children}
    </section>
  );
}

export function KeyValue(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{props.label}</span>
      <span className="font-medium text-slate-900">{props.value}</span>
    </div>
  );
}
