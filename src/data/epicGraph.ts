// Снапшот связей эпиков для графа по клику на карточку.
//
// Данные лежат в epicGraph.json и собираются скриптом scripts/genGraph.mjs
// из сырых дампов Jira (parent = KEY). Бэка нет — ассистент снимает дочерние
// задачи через MCP и перегенерирует json вместе с утренними правками.
//
// Узлы: все дочерние задачи эпика (Задачи + Баги) со статусом. Цвет узла —
// по смыслу статуса (toneOfStatus). В графе это даёт плотную «карту» эпика.

import data from "./epicGraph.json";

export type GraphTone = "danger" | "warn" | "progress" | "ready" | "done" | "muted";

export interface GraphNode {
  key: string;
  title: string;
  type: "bug" | "task";
  status: string;
  cat: string; // statusCategory: new | indeterminate | done
}

// Связанная задача (issue link), а не дочерняя. relation — тип связи Jira
// (Relates / Parent-Child / Blocks…). Кросс-проектные «дети» приходят именно
// сюда, т.к. связаны линком, а не полем parent.
export interface LinkedNode extends GraphNode {
  relation: string;
}

export interface EpicGraphData {
  nodes: GraphNode[];
  linked?: LinkedNode[];
}

export const epicGraph = data as Record<string, EpicGraphData>;

// Цвета тонов (hex — для canvas force-graph).
export const TONE_HEX: Record<GraphTone, string> = {
  danger: "#fb7185", // rose-400 — reopen / блок
  warn: "#fbbf24", // amber-400 — новые / backlog
  progress: "#38bdf8", // sky-400 — в QA
  ready: "#2dd4bf", // teal-400 — release / merge
  done: "#34d399", // emerald-400 — закрыто
  muted: "#94a3b8", // slate-400 — прочее
};

// Статус Jira → тон узла.
export function toneOfStatus(status: string, cat: string): GraphTone {
  const s = status.toLowerCase();
  if (cat === "done") return "done";
  if (s.includes("reopen") || s.includes("block") || s.includes("блок")) return "danger";
  if (s.includes("release") || s.includes("merge")) return "ready";
  if (s.includes("qa")) return "progress";
  if (cat === "new" || s.includes("backlog") || s.includes("to do") || s.includes("open"))
    return "warn";
  return "muted";
}
