// src/app/admin/page.tsx
"use client";
import { useEffect, useState } from "react";

interface SyncStatus { synced: number; errors: string[]; syncedAt: string | null }

export default function AdminDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/sprint/active")
      .then((r) => r.json())
      .then((d) => setStatus({ synced: 0, errors: [], syncedAt: d.syncedAt }));
  }, []);

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/jira/sync", { method: "POST" });
    const data = await res.json() as SyncStatus;
    setStatus({ ...data, syncedAt: new Date().toISOString() });
    setSyncing(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>
      <div className="bg-gray-900 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Последний синк Jira</p>
            <p className="text-white">
              {status?.syncedAt
                ? new Date(status.syncedAt).toLocaleString("ru-RU")
                : "Никогда"}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
          >
            {syncing ? "Синкаем..." : "Синк Jira"}
          </button>
        </div>
        {status?.errors?.length ? (
          <div className="text-red-400 text-sm space-y-1">
            {status.errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        ) : null}
        {status?.synced ? (
          <p className="text-green-400 text-sm">Обновлено эпиков: {status.synced}</p>
        ) : null}
      </div>
    </div>
  );
}
