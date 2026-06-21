// src/app/admin/assignments/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";

interface Member { id: string; name: string; team: string }
interface Epic { id: number; jiraKey: string; title: string | null; team: string }
interface Assignment { memberId: string; jiraKey: string; note: string | null }
interface SprintData {
  sprint: { id: number; number: number };
  epics: Epic[]; members: Member[]; assignments: Assignment[];
}

export default function AdminAssignments() {
  const [data, setData] = useState<SprintData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sprint/active");
    setData(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(memberId: string, jiraKey: string, currentNote: string | null) {
    const existing = data?.assignments.find(
      (a) => a.memberId === memberId && a.jiraKey === jiraKey
    );
    if (existing) {
      // Удалить
      await fetch(`/api/assignments/${data!.sprint.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, jiraKey }),
      });
    } else {
      // Добавить
      await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: data!.sprint.id, memberId, jiraKey }),
      });
    }
    await load();
  }

  if (!data) return <p className="text-gray-400">Загрузка...</p>;

  const coreEpics = data.epics.filter((e) => e.team === "CORE");
  const coreMembers = data.members.filter((m) => m.team === "CORE");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Назначения — Спринт {data.sprint.number}</h1>
      <p className="text-gray-400 text-sm">Клик по ячейке — назначить/снять.</p>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-400 py-1 pr-3 font-normal min-w-24">Тестер</th>
              {coreEpics.map((e) => (
                <th key={e.id} className="text-center text-gray-400 py-1 px-1 font-normal max-w-16">
                  <span className="block truncate w-14" title={e.title ?? e.jiraKey}>
                    {e.jiraKey}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coreMembers.map((m) => (
              <tr key={m.id} className="border-t border-gray-800/50">
                <td className="py-1 pr-3 text-gray-300 whitespace-nowrap">{m.name}</td>
                {coreEpics.map((e) => {
                  const assigned = data.assignments.some(
                    (a) => a.memberId === m.id && a.jiraKey === e.jiraKey
                  );
                  return (
                    <td
                      key={e.id}
                      onClick={() => toggle(m.id, e.jiraKey, null)}
                      className={`text-center py-1 px-1 cursor-pointer rounded ${
                        assigned
                          ? "bg-indigo-500/30 text-indigo-300"
                          : "hover:bg-gray-800"
                      }`}
                    >
                      {assigned ? "●" : "○"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
