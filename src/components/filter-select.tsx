import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  className?: string
}

export function FilterSelect({ value, onValueChange, options, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "w-full sm:w-auto h-8 px-3 text-xs border-0 bg-muted/50 hover:bg-muted rounded-md",
          "focus:ring-0 focus:ring-offset-0 focus:bg-muted",
          "[&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[120px]">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="text-xs">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
