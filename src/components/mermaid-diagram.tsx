"use client"

import * as React from "react"
import mermaid from "mermaid"

// Initialize mermaid with config
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
})

interface MermaidDiagramProps {
  chart: string
  className?: string
}

// Memoized to prevent re-renders on parent scroll/type
export const MermaidDiagram = React.memo(function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [svg, setSvg] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)
  const lastChartRef = React.useRef<string>("")

  React.useEffect(() => {
    // Debounce rendering to prevent flashing during streaming
    const trimmedChart = chart.trim()

    // Skip if chart hasn't actually changed
    if (trimmedChart === lastChartRef.current) return

    const timeoutId = setTimeout(async () => {
      if (!trimmedChart) return

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, trimmedChart)
        setSvg(svg)
        setError(null)
        lastChartRef.current = trimmedChart
      } catch (err) {
        // Only show error if chart looks complete (has end markers)
        if (trimmedChart.includes("end") || trimmedChart.includes("-->")) {
          console.error("Mermaid render error:", err)
          setError("Failed to render diagram")
        }
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [chart])

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-sm text-destructive">
        {error}
        <pre className="mt-2 text-xs opacity-70 overflow-x-auto">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50 animate-pulse">
        Loading diagram...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}, (prevProps, nextProps) => {
  // Only re-render if chart content actually changed
  return prevProps.chart.trim() === nextProps.chart.trim() && prevProps.className === nextProps.className
})
