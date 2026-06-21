// src/app/admin/sprints/page.tsx
"use client";
import { useEffect, useState } from "react";

interface Sprint {
  id: number; number: number; start: string; end: string;
  confluenceUrl: string | null;
}

export default function AdminSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [form, setForm] = useState({ number: "", start: "", end: "", confluenceUrl: "" });
  const [creating, setCreating] = useState(false);

  async function loadSprints() {
    // Активный спринт через /api/sprint/active (ответ — camelCase: id, number, start, end, confluenceUrl)
    const res = await fetch("/api/sprint/active");
    const d = await res.json();
    if (d.sprint) setSprints([d.sprint]);
  }

  useEffect(() => { loadSprints(); }, []);

  async function createSprint(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/sprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: Number(form.number),
        start: form.start,
        end: form.end,
        confluenceUrl: form.confluenceUrl || undefined,
      }),
    });
    setCreating(false);
    await loadSprints();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Спринты</h1>

      <div className="space-y-2">
        {sprints.map((s) => (
          <div key={s.id} className="bg-gray-900 rounded-xl px-6 py-4 flex items-center gap-4">
            <span className="text-indigo-400 font-bold">Спринт {s.number}</span>
            <span className="text-gray-400 text-sm">{s.start} — {s.end}</span>
            <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded-full">
              Активный
            </span>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl p-6 space-y-4 max-w-md">
        <h2 className="font-bold">Создать новый спринт</h2>
        <form onSubmit={createSprint} className="space-y-3">
          <input
            type="number"
            placeholder="Номер спринта"
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            placeholder="Начало"
            value={form.start}
            onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            placeholder="Конец"
            value={form.end}
            onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="url"
            placeholder="Confluence URL (необязательно)"
            value={form.confluenceUrl}
            onChange={(e) => setForm((f) => ({ ...f, confluenceUrl: e.target.value }))}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
          >
            {creating ? "Создаём..." : "Создать спринт"}
          </button>
        </form>
      </div>
    </div>
  );
}
