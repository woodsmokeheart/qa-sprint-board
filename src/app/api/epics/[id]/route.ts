// src/app/api/epics/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

interface Params { params: Promise<{ id: string }> }

// PUT /api/epics/:id — обновить флаги, goal, firstPass
export async function PUT(request: Request, { params }: Params) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json() as {
    goal?: string; priority?: string; critbusiness?: boolean; bonus?: boolean;
    task?: boolean; goalDone?: boolean; firstPass?: number; updatedBy?: string;
  };

  // Обновляем sprint_epics
  await sql`
    UPDATE sprint_epics SET
      goal         = COALESCE(${body.goal ?? null}, goal),
      priority     = COALESCE(${body.priority ?? null}, priority),
      critbusiness = COALESCE(${body.critbusiness ?? null}, critbusiness),
      bonus        = COALESCE(${body.bonus ?? null}, bonus),
      task         = COALESCE(${body.task ?? null}, task),
      goal_done    = COALESCE(${body.goalDone ?? null}, goal_done)
    WHERE id = ${id}
  `;

  // Если передан firstPass — upsert в progress_entries
  if (body.firstPass !== undefined) {
    const epicRows = (await sql`
      SELECT sprint_id, jira_key FROM sprint_epics WHERE id = ${id}
    `) as Array<{ sprint_id: number; jira_key: string }>;
    if (epicRows.length > 0) {
      const { sprint_id, jira_key } = epicRows[0];
      await sql`
        INSERT INTO progress_entries (sprint_id, jira_key, first_pass, updated_at, updated_by)
        VALUES (${sprint_id}, ${jira_key}, ${body.firstPass}, now(), ${body.updatedBy ?? 'admin'})
        ON CONFLICT (sprint_id, jira_key) DO UPDATE SET
          first_pass = EXCLUDED.first_pass,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
      `;
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/epics/:id
export async function DELETE(request: Request, { params }: Params) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  await sql`DELETE FROM sprint_epics WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
