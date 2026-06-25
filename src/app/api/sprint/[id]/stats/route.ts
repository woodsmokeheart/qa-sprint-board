// src/app/api/sprint/[id]/stats/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { notFound } from "@/lib/http";

interface Params { params: Promise<{ id: string }> }

interface GraphNode { type: "bug" | "task"; tone: string }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const sprintRows = (await sql`
    SELECT id, number, start_date::text AS start, end_date::text AS end, is_active
    FROM sprints WHERE id = ${id}
  `) as Array<{ id: number; number: number; start: string; end: string; is_active: boolean }>;

  if (sprintRows.length === 0) return notFound("Спринт не найден");
  const sprint = sprintRows[0];

  // Все эпики спринта с кэшем и прогрессом
  const epics = (await sql`
    SELECT
      se.jira_key, se.priority, se.critbusiness, se.goal, se.goal_done,
      jc.jira_status, jc.retest_pct, jc.graph_nodes,
      COALESCE(pe.first_pass, 0) AS first_pass
    FROM sprint_epics se
    LEFT JOIN jira_cache jc ON jc.jira_key = se.jira_key
    LEFT JOIN progress_entries pe ON pe.sprint_id = se.sprint_id AND pe.jira_key = se.jira_key
    WHERE se.sprint_id = ${id}
  `) as Array<{
    jira_key: string; priority: string; critbusiness: boolean;
    goal: string | null; goal_done: boolean;
    jira_status: string | null; retest_pct: number;
    graph_nodes: GraphNode[] | null; first_pass: number;
  }>;

  // Назначения с именами участников
  const assignmentRows = (await sql`
    SELECT a.jira_key, a.member_id, m.name, m.team
    FROM assignments a
    JOIN members m ON m.id = a.member_id
    WHERE a.sprint_id = ${id}
  `) as Array<{ jira_key: string; member_id: string; name: string; team: string }>;

  // --- Sprint-level ---
  const total = epics.length;
  const statusCounts: Record<string, number> = {};
  let totalFirstPass = 0;
  let firstPassCount = 0;
  let totalBugs = 0;
  let critDone = 0;
  let critTotal = 0;
  const goalsAll: Array<{ key: string; text: string; done: boolean }> = [];

  for (const e of epics) {
    const s = e.jira_status ?? "backlog";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;

    if (e.first_pass > 0) { totalFirstPass += e.first_pass; firstPassCount++; }

    if (Array.isArray(e.graph_nodes)) {
      totalBugs += e.graph_nodes.filter((n) => n.type === "bug").length;
    }

    if (e.critbusiness) {
      critTotal++;
      if (s === "done") critDone++;
    }

    if (e.goal) goalsAll.push({ key: e.jira_key, text: e.goal, done: e.goal_done });
  }

  const donePct = total > 0 ? Math.round(((statusCounts["done"] ?? 0) / total) * 100) : 0;
  const goalsDone = goalsAll.filter((g) => g.done).length;
  const avgFirstPass = firstPassCount > 0 ? Math.round(totalFirstPass / firstPassCount) : null;

  // --- Per-person ---
  const epicByKey = new Map(epics.map((e) => [e.jira_key, e]));

  // member_id → { name, team, assigned[], firstPassSum, firstPassCount, retestSum, bugs }
  const personMap = new Map<string, {
    id: string; name: string; team: string;
    keys: string[];
    firstPassSum: number; fpCount: number;
    retestSum: number; bugs: number;
  }>();

  for (const a of assignmentRows) {
    if (!personMap.has(a.member_id)) {
      personMap.set(a.member_id, {
        id: a.member_id, name: a.name, team: a.team,
        keys: [], firstPassSum: 0, fpCount: 0, retestSum: 0, bugs: 0,
      });
    }
    const p = personMap.get(a.member_id)!;
    p.keys.push(a.jira_key);

    const epic = epicByKey.get(a.jira_key);
    if (epic) {
      if (epic.first_pass > 0) { p.firstPassSum += epic.first_pass; p.fpCount++; }
      p.retestSum += epic.retest_pct ?? 0;
      if (Array.isArray(epic.graph_nodes)) {
        p.bugs += epic.graph_nodes.filter((n) => n.type === "bug").length;
      }
    }
  }

  const persons = [...personMap.values()].map((p) => {
    const closed = p.keys.filter((k) => epicByKey.get(k)?.jira_status === "done").length;
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      assigned: p.keys.length,
      closed,
      closeRate: p.keys.length > 0 ? Math.round((closed / p.keys.length) * 100) : 0,
      avgFirstPass: p.fpCount > 0 ? Math.round(p.firstPassSum / p.fpCount) : null,
      avgRetest: p.keys.length > 0 ? Math.round(p.retestSum / p.keys.length) : 0,
      bugs: p.bugs,
    };
  }).sort((a, b) => b.closeRate - a.closeRate);

  return NextResponse.json({
    sprint: { id: sprint.id, number: sprint.number, start: sprint.start, end: sprint.end, isActive: sprint.is_active },
    overview: {
      total,
      donePct,
      statusCounts,
      avgFirstPass,
      totalBugs,
      goals: { total: goalsAll.length, done: goalsDone, list: goalsAll },
      crit: { total: critTotal, done: critDone },
    },
    persons,
  });
}
