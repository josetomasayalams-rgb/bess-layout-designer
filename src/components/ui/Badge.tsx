import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
  {
    variants: {
      variant: {
        // Status semántico
        neutral: "border-slate-700 bg-slate-900 text-slate-300",
        info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
        warning: "border-amber-400/40 bg-amber-400/10 text-amber-300",
        critical: "border-rose-400/40 bg-rose-400/10 text-rose-300",
        compliant: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        // Clasificación de dato — paleta exclusiva, inconfundible entre sí
        certified: "border-blue-400/30 bg-blue-400/10 text-blue-300",
        preliminary: "border-amber-400/40 bg-amber-400/10 text-amber-300",
        pending: "border-rose-400/40 bg-rose-400/10 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
