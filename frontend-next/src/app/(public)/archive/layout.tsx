import type { ReactNode } from 'react';

export default function ArchiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      {children}
    </div>
  );
}
