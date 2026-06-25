"use client";
import { useEffect, useState } from "react";

interface Goal { key: string; text: string; done: boolean }
interface PersonStat {
  id: string; name: string; team: string;
  assigned: number; closed: number; closeRate: number;
  avgFirstPass: number | null; avgRetest: number; bugs: number;
}
interface SprintStats {
  sprint: { id: number; number: number; start: string; end: string; isActive: boolean };
  overview: {
    total: number; donePct: number;
    statusCounts: Record<string, number>;
    avgFirstPass: number | null;
    totalBugs: number;
    goals: { total: number; done: number; list: Goal[] };
    crit: { total: number; done: number };
  };
  persons: PersonStat[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  done:          { label: "Готово",        color: "bg-emerald-500" },
  rf_release:    { label: "RF Release",    color: "bg-teal-500" },
  qa_testing:    { label: "QA Testing",    color: "bg-indigo-500" },
  rf_qa:         { label: "RF QA",         color: "bg-violet-500" },
  in_development:{ label: "In Dev",        color: "bg-blue-500" },
  block_tests:   { label: "Блок тесты",    color: "bg-orange-500" },
  reopen:        { label: "Reopen",        color: "bg-rose-500" },
  analysis:      { label: "Analysis",      color: "bg-yellow-500" },
  backlog:       { label: "Backlog",       color: "bg-gray-500" },
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function SprintStatsModal({ sprintId, onClose }: { sprintId: number; onClose: () => void }) {
  const [stats, setStats] = useState<SprintStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sprint/${sprintId}/stats`)
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); });
  }, [sprintId]);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 rounded-2xl shadow-2xl">
        {loading || !stats ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Загрузка...</div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Статистика — Спринт {stats.sprint.number}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stats.sprint.start} — {stats.sprint.end}
                  {stats.sprint.isActive && (
                    <span className="ml-2 text-emerald-400">● активный</span>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Overview cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Закрыто эпиков" value={`${stats.overview.donePct}%`}
                  sub={`${stats.overview.statusCounts["done"] ?? 0} из ${stats.overview.total}`} />
                <Stat label="Цели выполнены"
                  value={`${stats.overview.goals.total > 0 ? Math.round((stats.overview.goals.done / stats.overview.goals.total) * 100) : 0}%`}
                  sub={`${stats.overview.goals.done} из ${stats.overview.goals.total}`} />
                <Stat label="Avg firstPass"
                  value={stats.overview.avgFirstPass !== null ? `${stats.overview.avgFirstPass}%` : "—"}
                  sub="качество проходки" />
                <Stat label="Баги найдено" value={stats.overview.totalBugs}
                  sub={stats.overview.crit.total > 0
                    ? `критбизнес: ${stats.overview.crit.done}/${stats.overview.crit.total}`
                    : "по графам эпиков"} />
              </div>

              {/* Status breakdown */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Статусы эпиков</h3>
                <div className="space-y-2">
                  {Object.entries(stats.overview.statusCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => {
                      const meta = STATUS_LABEL[status] ?? { label: status, color: "bg-gray-500" };
                      const pct = stats.overview.total > 0 ? Math.round((count / stats.overview.total) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-gray-400 truncate">{meta.label}</div>
                          <div className="flex-1">
                            <Bar pct={pct} color={meta.color} />
                          </div>
                          <div className="text-xs text-gray-400 w-12 text-right">{count} ({pct}%)</div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Goals */}
              {stats.overview.goals.list.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Цели спринта</h3>
                  <div className="space-y-1.5">
                    {stats.overview.goals.list.map((g) => (
                      <div key={g.key} className="flex items-start gap-2.5 text-sm">
                        <span className={`mt-0.5 shrink-0 ${g.done ? "text-emerald-400" : "text-rose-400"}`}>
                          {g.done ? "✓" : "✗"}
                        </span>
                        <span className={g.done ? "text-gray-300" : "text-white"}>{g.text}</span>
                        <span className="ml-auto text-xs text-gray-600 shrink-0">{g.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-person */}
              {stats.persons.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">По тестировщикам</h3>
                  <div className="space-y-2">
                    {stats.persons.map((p) => (
                      <div key={p.id} className="bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{p.name}</span>
                            <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{p.team}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{p.closed}/{p.assigned} закрыто</span>
                            {p.avgFirstPass !== null && (
                              <span className={p.avgFirstPass >= 80 ? "text-emerald-400" : p.avgFirstPass >= 50 ? "text-yellow-400" : "text-rose-400"}>
                                FP {p.avgFirstPass}%
                              </span>
                            )}
                            {p.avgRetest > 0 && <span className="text-violet-400">RT {p.avgRetest}%</span>}
                            {p.bugs > 0 && <span className="text-orange-400">🐛 {p.bugs}</span>}
                          </div>
                        </div>
                        <Bar
                          pct={p.closeRate}
                          color={p.closeRate >= 80 ? "bg-emerald-500" : p.closeRate >= 50 ? "bg-yellow-500" : "bg-rose-500"}
                        />
                        <div className="text-xs text-gray-600 mt-1">{p.closeRate}% close rate</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
