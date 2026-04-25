// components/LoadingSkeleton.tsx
// Reusable skeleton placeholder for loading states

export function LoadingSkeleton() {
  return (
    <div className="arc-card p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-arc-border/60 rounded w-1/3" />
      <div className="h-8 bg-arc-border/50 rounded w-1/2" />
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-arc-border/40 rounded" />
        ))}
      </div>
    </div>
  );
}
