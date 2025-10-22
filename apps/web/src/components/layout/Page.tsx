import type { ReactNode } from 'react';

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </div>
    </main>
  );
}
