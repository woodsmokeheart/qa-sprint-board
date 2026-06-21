// src/app/api/assignments/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json() as {
    sprintId: number; memberId: string; jiraKey: string; note?: string;
  };

  await sql`
    INSERT INTO assignments (sprint_id, member_id, jira_key, note)
    VALUES (${body.sprintId}, ${body.memberId}, ${body.jiraKey}, ${body.note ?? null})
    ON CONFLICT (sprint_id, member_id, jira_key) DO UPDATE SET note = EXCLUDED.note
  `;

  return NextResponse.json({ ok: true });
}
