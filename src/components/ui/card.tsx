import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
