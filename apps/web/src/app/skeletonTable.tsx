export function SkeletonTable() {
  return (
    <div className="w-full animate-pulse space-y-2">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: 4 }).map((__, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="h-8 flex-1 rounded bg-slate-800/60"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
