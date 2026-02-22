import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BrandButton({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      className={cn("bg-[#00719c] hover:bg-[#00415a] text-white", className)}
      {...props}
    >
      {children}
    </Button>
  )
}
