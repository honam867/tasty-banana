import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:focus-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-black rounded-pill shadow-glow hover:bg-primary-600 active:bg-primary-700",
        secondary:
          "bg-surface border border-border/60 text-text rounded-pill hover:bg-surface-2 hover:border-border",
        ghost:
          "text-text hover:text-primary hover:bg-surface/50 rounded-pill",
        destructive:
          "bg-danger text-white rounded-pill hover:bg-danger/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-pill gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 rounded-pill px-8 has-[>svg]:px-6",
        icon: "size-11 rounded-pill",
        "icon-sm": "size-9 rounded-pill",
        "icon-lg": "size-12 rounded-pill",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
