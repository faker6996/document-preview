"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual style; "ghost" (default) or "outline". */
  variant?: "ghost" | "outline";
  /** Kept for call-site compatibility; icon buttons are always square. */
  size?: "icon";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = "ghost", size: _size, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        variant === "outline" && "border border-border bg-background",
        className,
      )}
      {...props}
    />
  );
});
