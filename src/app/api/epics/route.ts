// src/app/api/epics/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json() as {
    sprintId: number; jiraKey: string; team: string;
    priority?: string; goal?: string; critbusiness?: boolean;
    bonus?: boolean; task?: boolean;
  };

  const [row] = (await sql`
    INSERT INTO sprint_epics (sprint_id, jira_key, team, priority, goal, critbusiness, bonus, task)
    VALUES (
      ${body.sprintId}, ${body.jiraKey}, ${body.team},
      ${body.priority ?? 'none'}, ${body.goal ?? null},
      ${body.critbusiness ?? false}, ${body.bonus ?? false}, ${body.task ?? false}
    )
    RETURNING id
  `) as Array<{ id: number }>;

  return NextResponse.json({ id: row.id });
}
