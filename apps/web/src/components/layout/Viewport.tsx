import type { ReactNode } from 'react';

export function Viewport({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-10">{children}</div>;
}
