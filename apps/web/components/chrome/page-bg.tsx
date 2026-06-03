"use client";

/**
 * Full-bleed page background: Monad bg + faint purple hero grid (GridBG). Shared
 * by the pre/post-game routes so every screen sits on the design's dark canvas.
 */
import type { ReactNode } from "react";
import { GridBG, C } from "@/components/primitives";

export function PageBg({
  children,
  opacity = 0.5,
  fade = "ellipse 70% 55% at 50% 25%, black 0%, transparent 72%",
  className,
}: {
  children: ReactNode;
  opacity?: number;
  fade?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-h-dvh flex-col ${className ?? ""}`}
      style={{ background: C.bg }}
    >
      <GridBG opacity={opacity} fade={fade} />
      <div className="relative flex min-h-dvh flex-1 flex-col">{children}</div>
    </div>
  );
}
