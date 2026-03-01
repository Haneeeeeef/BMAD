import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
        <Link href="/" className="inline-block px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
          Go home
        </Link>
      </div>
    </div>
  )
}
