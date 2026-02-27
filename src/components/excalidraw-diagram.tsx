"use client"

import * as React from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import "@excalidraw/excalidraw/index.css"

// Set font path for self-hosted fonts
if (typeof window !== "undefined") {
  (window as any).EXCALIDRAW_ASSET_PATH = "/fonts/"
}

// Dynamic imports for heavy Excalidraw libraries
const loadExcalidraw = () => import("@excalidraw/excalidraw")
const loadMermaidToExcalidraw = () => import("@excalidraw/mermaid-to-excalidraw")

interface ExcalidrawDiagramProps {
  chart: string
  className?: string
}

// Memoized to prevent re-renders on parent scroll/type
export const ExcalidrawDiagram = React.memo(function ExcalidrawDiagram({ chart, className }: ExcalidrawDiagramProps) {
  const [ExcalidrawComponent, setExcalidrawComponent] = React.useState<React.ComponentType<any> | null>(null)
  const [elements, setElements] = React.useState<any[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const lastChartRef = React.useRef<string>("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Load Excalidraw component once
  React.useEffect(() => {
    loadExcalidraw().then((mod) => {
      setExcalidrawComponent(() => mod.Excalidraw)
    })
  }, [])

  // Parse Mermaid to Excalidraw elements
  React.useEffect(() => {
    // Preprocess: convert <br> tags to newlines for mermaid
    const trimmedChart = chart.trim().replace(/<br\s*\/?>/gi, '\n')

    // Skip if chart hasn't changed
    if (trimmedChart === lastChartRef.current) return

    // Debounce to prevent flashing during streaming
    const timeoutId = setTimeout(async () => {
      if (!trimmedChart) return

      setIsLoading(true)

      try {
        const [mermaidMod, excalidrawMod] = await Promise.all([
          loadMermaidToExcalidraw(),
          loadExcalidraw()
        ])

        // Parse Mermaid to skeleton elements
        const { elements: skeletonElements } = await mermaidMod.parseMermaidToExcalidraw(trimmedChart)

        // Convert to full Excalidraw elements
        const fullElements = excalidrawMod.convertToExcalidrawElements(skeletonElements)

        setElements(fullElements)
        setError(null)
        lastChartRef.current = trimmedChart
      } catch (err) {
        // Only show error if chart looks complete
        if (trimmedChart.includes("end") || trimmedChart.includes("-->") || trimmedChart.includes("---")) {
          console.error("Mermaid parse error:", err)
          setError("Failed to parse diagram")
        }
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [chart])

  // Export to excalidraw.com - copy JSON to clipboard and open site
  const handleExport = React.useCallback(async () => {
    try {
      // Create scene data in Excalidraw format
      const sceneData = {
        type: "excalidraw",
        version: 2,
        source: "mission-control",
        elements: elements,
        appState: {
          viewBackgroundColor: "#ffffff",
          gridSize: null,
        },
        files: {},
      }

      // Copy to clipboard so user can paste in Excalidraw
      const json = JSON.stringify(sceneData, null, 2)
      await navigator.clipboard.writeText(json)

      // Open Excalidraw
      window.open("https://excalidraw.com/", "_blank")

      // Show toast notification
      toast.success("Diagram copied! Press Ctrl/Cmd+V in Excalidraw to paste", {
        duration: 5000,
      })
    } catch (err) {
      console.error("Export error:", err)
    }
  }, [elements])

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-sm text-destructive">
        {error}
        <pre className="mt-2 text-xs opacity-70 overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    )
  }

  if (isLoading || !ExcalidrawComponent) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Rendering diagram...</span>
      </div>
    )
  }

  if (elements.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
        No diagram to display
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Export button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          aria-label="Open in Excalidraw"
        >
          <ExternalLink className="h-3 w-3" />
          Edit in Excalidraw
        </button>
      </div>

      {/* Excalidraw canvas */}
      <div
        ref={containerRef}
        className="border rounded-lg overflow-hidden bg-white"
        style={{ height: "400px" }}
      >
        <ExcalidrawComponent
          initialData={{
            elements: elements,
            appState: {
              viewBackgroundColor: "#ffffff",
              zenModeEnabled: true,
              viewModeEnabled: true,
              gridSize: null,
            },
          }}
          viewModeEnabled={true}
          zenModeEnabled={true}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if chart content actually changed
  return prevProps.chart.trim() === nextProps.chart.trim() && prevProps.className === nextProps.className
})
