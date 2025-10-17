import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-text placeholder:text-text-dim selection:bg-primary selection:text-black bg-surface-2 border-border h-11 w-full min-w-0 rounded-[14px] border px-4 py-2 text-base transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:focus-ring",
        "aria-invalid:ring-danger/20 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
