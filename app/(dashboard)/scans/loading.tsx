import { Skeleton } from '@/components/ui/skeleton'

export default function ScansLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    </div>
  )
}
