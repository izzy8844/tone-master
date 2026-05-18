'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold text-red-400">Something went wrong</h1>
      <p className="text-zinc-400 text-sm max-w-md text-center">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
