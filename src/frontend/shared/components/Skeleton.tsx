interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-neutral-100 animate-pulse rounded ${className}`} />;
}
