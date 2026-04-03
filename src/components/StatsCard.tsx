"use client";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
};

export default function StatsCard({ label, value, sub, color = "text-blue-600 dark:text-blue-400" }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}
