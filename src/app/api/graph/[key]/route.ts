import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { GraphNode, LinkedNode } from "@/data/epicGraph";

type MaybeJson<T> = T | string | null;

function asArray<T>(v: MaybeJson<T[]>): T[] {
  if (!v) return [];
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T[];
    } catch {
      return [];
    }
  }
  return v;
}

// Живой снапшот графа эпика из jira_cache (обновляется кроном). Публичный read —
// доска открыта без авторизации. Если снапшота нет, фронт падает на статику.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  try {
    const rows = (await sql`
      SELECT graph_nodes, graph_linked, synced_at
      FROM jira_cache
      WHERE jira_key = ${key}
    `) as Array<{
      graph_nodes: MaybeJson<GraphNode[]>;
      graph_linked: MaybeJson<LinkedNode[]>;
      synced_at: string | null;
    }>;

    if (rows.length === 0) {
      return NextResponse.json({ nodes: [], linked: [], syncedAt: null });
    }

    return NextResponse.json({
      nodes: asArray<GraphNode>(rows[0].graph_nodes),
      linked: asArray<LinkedNode>(rows[0].graph_linked),
      syncedAt: rows[0].synced_at,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Graph fetch failed" },
      { status: 500 },
    );
  }
}
