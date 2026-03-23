'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getRealmSurface } from './realmRegistry';

export function useRealmSurface() {
  const pathname = usePathname();

  return useMemo(() => getRealmSurface(pathname), [pathname]);
}
