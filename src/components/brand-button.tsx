import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BrandButton({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      className={cn("bg-blue-600 hover:bg-blue-700 text-white", className)}
      {...props}
    >
      {children}
    </Button>
  )
}
