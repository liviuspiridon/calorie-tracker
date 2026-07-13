export function ProteinProgress({ consumed, target }: { consumed: number; target: number }) {
  const remaining = Math.max(0, target - consumed);
  const progress = target > 0 ? Math.min(1, consumed / target) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
          Protein
        </span>
        <span className="text-sm font-medium tabular-nums">
          {remaining > 0 ? `${remaining}g left` : "Target reached"}
        </span>
      </div>
      <div className="bg-muted/70 h-[5px] overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span>{consumed}g eaten</span>
        <span>{target}g target</span>
      </div>
    </div>
  );
}
