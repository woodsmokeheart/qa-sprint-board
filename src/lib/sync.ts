// src/lib/sync.ts
import { sql } from "./db";
import { fetchEpicsMeta, fetchRetestPct, fetchEpicGraph, type EpicGraphSnapshot } from "./jira";

export async function syncActiveSprintEpics(): Promise<{ synced: number; errors: string[] }> {
  // Достаём ключи активного спринта
  const rows = await sql`
    SELECT se.jira_key
    FROM sprint_epics se
    JOIN sprints s ON s.id = se.sprint_id
    WHERE s.is_active = true
  ` as Array<{ jira_key: string }>;

  const keys = rows.map((r) => r.jira_key);
  if (keys.length === 0) return { synced: 0, errors: [] };

  const errors: string[] = [];

  // Батч-запрос мета всех эпиков
  let metaMap: Map<string, Awaited<ReturnType<typeof fetchEpicsMeta>>[number]>;
  try {
    const metas = await fetchEpicsMeta(keys);
    metaMap = new Map(metas.map((m) => [m.key, m]));
  } catch (e) {
    errors.push(`fetchEpicsMeta failed: ${String(e)}`);
    return { synced: 0, errors };
  }

  // Параллельный подсчёт retest % для каждого эпика
  const retestResults = await Promise.allSettled(
    keys.map(async (key) => {
      const pct = await fetchRetestPct(key);
      return { key, pct };
    })
  );

  const retestMap = new Map<string, number>();
  for (const r of retestResults) {
    if (r.status === "fulfilled") {
      retestMap.set(r.value.key, r.value.pct);
    } else {
      errors.push(`retest fetch failed: ${String(r.reason)}`);
    }
  }

  // Параллельный сбор живого графа (дочерние + связанные) для каждого эпика
  const graphResults = await Promise.allSettled(
    keys.map(async (key) => ({ key, graph: await fetchEpicGraph(key) }))
  );

  const graphMap = new Map<string, EpicGraphSnapshot>();
  for (const r of graphResults) {
    if (r.status === "fulfilled") {
      graphMap.set(r.value.key, r.value.graph);
    } else {
      errors.push(`graph fetch failed: ${String(r.reason)}`);
    }
  }

  // Пишем в jira_cache
  let synced = 0;
  for (const key of keys) {
    const meta = metaMap.get(key);
    if (!meta) { errors.push(`meta not found for ${key}`); continue; }

    const graph = graphMap.get(key);
    const graphNodes = graph ? JSON.stringify(graph.nodes) : null;
    const graphLinked = graph ? JSON.stringify(graph.linked) : null;

    try {
      await sql`
        INSERT INTO jira_cache (jira_key, title, jira_status, assignee_name, assignee_id, priority, retest_pct, issue_type, graph_nodes, graph_linked, synced_at)
        VALUES (
          ${key}, ${meta.title}, ${meta.jiraStatus},
          ${meta.assigneeName}, ${meta.assigneeId}, ${meta.priority},
          ${retestMap.get(key) ?? 0}, ${meta.issueType},
          ${graphNodes}::jsonb, ${graphLinked}::jsonb, now()
        )
        ON CONFLICT (jira_key) DO UPDATE SET
          title         = EXCLUDED.title,
          jira_status   = EXCLUDED.jira_status,
          assignee_name = EXCLUDED.assignee_name,
          assignee_id   = EXCLUDED.assignee_id,
          priority      = EXCLUDED.priority,
          retest_pct    = EXCLUDED.retest_pct,
          issue_type    = EXCLUDED.issue_type,
          graph_nodes   = COALESCE(EXCLUDED.graph_nodes, jira_cache.graph_nodes),
          graph_linked  = COALESCE(EXCLUDED.graph_linked, jira_cache.graph_linked),
          synced_at     = now()
      `;
      synced++;
    } catch (e) {
      errors.push(`upsert failed ${key}: ${String(e)}`);
      continue;
    }
  }

  return { synced, errors };
}
