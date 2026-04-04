"use client";

import { useMemo, useState } from "react";

type HeatmapData = { date: string; count: number };

type Props = {
  data: HeatmapData[];
};

function getColorClass(count: number): string {
  if (count === 0) return "bg-zinc-200 dark:bg-zinc-700";
  if (count <= 4) return "bg-green-200 dark:bg-green-800";
  if (count <= 14) return "bg-green-400 dark:bg-green-600";
  return "bg-green-600 dark:bg-green-400";
}

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const DAY_LABELS = ["", "月", "", "水", "", "金", ""];

export default function CalendarHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);

  const { weeks, monthHeaders } = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const d of data) {
      countMap.set(d.date, d.count);
    }

    // Build grid: 52 weeks x 7 days ending today
    const today = new Date();
    // Find the last Saturday (end of week row, Sun=0 based grid)
    const endDate = new Date(today);

    // We want 52 full weeks + partial current week
    // Start from 364 days ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeksArr: { date: string; count: number; dayOfWeek: number; isToday: boolean; isFuture: boolean }[][] = [];
    const todayStr = today.toISOString().slice(0, 10);

    let current = new Date(startDate);
    let currentWeek: typeof weeksArr[number] = [];

    while (current <= endDate || currentWeek.length > 0) {
      const dateStr = current.toISOString().slice(0, 10);
      const isFuture = current > today;

      currentWeek.push({
        date: dateStr,
        count: isFuture ? 0 : (countMap.get(dateStr) || 0),
        dayOfWeek: current.getDay(),
        isToday: dateStr === todayStr,
        isFuture,
      });

      if (current.getDay() === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
        if (current > endDate) break;
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    // Month headers: find the first week where a new month starts
    const headers: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    for (let wi = 0; wi < weeksArr.length; wi++) {
      const firstDay = weeksArr[wi][0];
      if (!firstDay) continue;
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        headers.push({ label: MONTH_LABELS[month], weekIndex: wi });
        lastMonth = month;
      }
    }

    return { weeks: weeksArr, monthHeaders: headers };
  }, [data]);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
        学習カレンダー
      </h3>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5 relative" style={{ minWidth: "max-content" }}>
          {/* Month labels */}
          <div className="flex ml-8" style={{ height: 16 }}>
            {monthHeaders.map((mh, i) => (
              <span
                key={`${mh.label}-${i}`}
                className="text-[10px] text-zinc-400 absolute"
                style={{ left: 32 + mh.weekIndex * 14 }}
              >
                {mh.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1" style={{ width: 28 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-3 flex items-center">
                  <span className="text-[10px] text-zinc-400 leading-none">{label}</span>
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`w-3 h-3 rounded-sm ${
                        day.isFuture
                          ? "bg-transparent"
                          : day.isToday
                          ? `${getColorClass(day.count)} ring-1 ring-zinc-400 dark:ring-zinc-500`
                          : getColorClass(day.count)
                      } cursor-pointer`}
                      onMouseEnter={(e) => {
                        if (!day.isFuture) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top, date: day.date, count: day.count });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 ml-8">
            <span className="text-[10px] text-zinc-400 mr-1">少</span>
            <div className="w-3 h-3 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800" />
            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
            <span className="text-[10px] text-zinc-400 ml-1">多</span>
          </div>
        </div>
      </div>

      {/* Tooltip (portal-style fixed) */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 30,
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.date}: {tooltip.count}回復習
        </div>
      )}
    </div>
  );
}
