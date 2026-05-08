import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

const gradientButtonVariants = cva(
    [
        "gradient-button",
        "inline-flex items-center justify-center gap-2",
        "rounded-full min-w-[132px] px-6 py-3",
        "text-[0.9375rem] leading-tight font-semibold text-white",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "h-[2.75rem]",
    ],
    {
        variants: {
            variant: {
                default: "",
                variant: "gradient-button-variant",
            },
            size: {
                default: "",
                sm: "h-[2.25rem] px-4 py-2 min-w-[100px] text-sm",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export const GradientButton = forwardRef(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(gradientButtonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
GradientButton.displayName = "GradientButton";
