"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
}

/**
 * A wrapper component that ensures its children are only rendered on the client-side.
 * This is used to prevent hydration mismatches with components that generate
 * unique IDs or rely on browser-specific APIs during rendering.
 */
export function ClientOnly({ children }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
