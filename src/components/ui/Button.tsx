import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-cyan-600 text-white hover:bg-cyan-500",
        secondary:
          "border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500 hover:bg-slate-800",
        ghost: "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
        danger:
          "border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:border-rose-400 hover:bg-rose-500/20",
      },
      size: {
        sm: "h-7 px-2 text-[11px]",
        md: "h-8 px-2.5 text-xs",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
