import type { ReactNode } from 'react';

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center text-slate-400">
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      {description ? <div className="text-sm text-slate-400">{description}</div> : null}
    </div>
  );
}
