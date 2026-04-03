"use client";

type Segment = {
  label: string;
  count: number;
  color: string;
};

type Props = {
  segments: Segment[];
  total: number;
};

export default function ProgressBar({ segments, total }: Props) {
  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all duration-500`}
            style={{ width: `${(seg.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
            <span>
              {seg.label} ({seg.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
