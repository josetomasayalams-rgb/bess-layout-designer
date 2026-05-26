"use client";

interface GridPreviewProps {
  columns: number;
  rows: number;
  filled: number;
}

export function GridPreview({ columns, rows, filled }: GridPreviewProps) {
  if (columns < 1 || rows < 1) return null;

  // Very large or very elongated grids: show a proportional box instead.
  if (columns > 44 || rows > 44) {
    const ratio = columns / rows;
    const width = Math.max(24, Math.min(176, ratio * 64));
    const height = Math.max(18, Math.min(120, 64 / ratio));
    return (
      <div className="flex items-center justify-center rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div
          className="rounded-sm border border-cyan-500/50 bg-cyan-500/15"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>
    );
  }

  const total = columns * rows;
  return (
    <div
      className="grid gap-[2px] rounded-md border border-slate-800 bg-slate-900/70 p-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`aspect-square rounded-[1px] ${
            index < filled ? "bg-cyan-400/70" : "bg-slate-700/40"
          }`}
        />
      ))}
    </div>
  );
}
