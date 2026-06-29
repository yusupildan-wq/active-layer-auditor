interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: string
}

export default function Skeleton({ width, height, className = '', rounded = '6px' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: rounded }}
    />
  )
}

export function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <Skeleton width={140} height={14} />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton key={i} width={80} height={14} className="ml-auto" />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}
