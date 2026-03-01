export default function ProjectLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" role="status" aria-label="Loading" />
        <span>Loading project...</span>
      </div>
    </div>
  )
}
