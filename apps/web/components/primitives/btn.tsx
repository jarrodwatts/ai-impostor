"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { C } from "./tokens";
import { audio } from "@/lib/audio/engine";

/**
 * Radial pill button. Exact recreation of `Btn` from screens-shared.jsx
 * (gradients + shadows preserved byte-for-byte via inline style maps; the
 * structural layout/typography lives in the CVA class list).
 *
 * Variants: primary | secondary | tertiary | berry.
 */
const btnVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border-0 whitespace-nowrap uppercase font-mono font-medium cursor-pointer transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
  {
    variants: {
      variant: {
        primary: "text-white",
        secondary: "text-[#0A0A0A]",
        tertiary: "text-white",
        berry: "text-white",
      },
      size: {
        default: "h-12 px-6 text-[12px] tracking-[0.08em]",
        sm: "h-9 px-4 text-[11px] tracking-[0.08em]",
      },
      full: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: { variant: "primary", size: "default", full: false },
  },
);

const VARIANT_STYLE: Record<string, React.CSSProperties> = {
  primary: {
    background: C.radialPrimary,
    boxShadow: C.shadowPrimary,
  },
  secondary: {
    background: C.radialSecondary,
    boxShadow: C.shadowSecondary,
  },
  tertiary: {
    background: "rgba(255,255,255,0.04)",
    boxShadow: `inset 0 0 0 1px ${C.line}`,
  },
  berry: {
    background: C.radialBerry,
    boxShadow: C.shadowBerry,
  },
};

export type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof btnVariants> & {
    icon?: React.ReactNode;
  };

export function Btn({
  className,
  variant = "primary",
  size = "default",
  full,
  icon,
  children,
  style,
  type = "button",
  onClick,
  ...props
}: BtnProps) {
  const vstyle = VARIANT_STYLE[variant ?? "primary"];
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    audio.playSfx("click");
    onClick?.(e);
  };
  return (
    <button
      type={type}
      className={cn(btnVariants({ variant, size, full }), className)}
      style={{ ...vstyle, ...style }}
      onClick={handleClick}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export { btnVariants };
